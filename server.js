const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Data directory
const DATA_DIR = path.join(__dirname, 'user-data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple user storage (JSON files)
const getUserFilePath = (username) => path.join(DATA_DIR, `${username}.json`);

// ===== API Routes =====

// Register/Login (simplified - same endpoint)
app.post('/api/auth', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // Sanitize username
    const safeUsername = username.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    const userFile = getUserFilePath(safeUsername);

    if (fs.existsSync(userFile)) {
        // Login: verify password
        const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
        if (userData.password === password) {
            res.json({
                success: true,
                message: '登录成功',
                username: safeUsername,
                data: userData.progress || {}
            });
        } else {
            res.status(401).json({ error: '密码错误' });
        }
    } else {
        // Register: create new user
        const newUser = {
            username: safeUsername,
            password: password,
            createdAt: new Date().toISOString(),
            progress: {
                completedEpisodes: [],
                currentEpisode: 1
            }
        };
        fs.writeFileSync(userFile, JSON.stringify(newUser, null, 2));
        res.json({
            success: true,
            message: '注册成功',
            username: safeUsername,
            data: newUser.progress
        });
    }
});

// Save user progress
app.post('/api/progress/:username', (req, res) => {
    const { username } = req.params;
    const { progress } = req.body;

    const safeUsername = username.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    const userFile = getUserFilePath(safeUsername);

    if (!fs.existsSync(userFile)) {
        return res.status(404).json({ error: '用户不存在' });
    }

    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    userData.progress = progress;
    userData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    res.json({ success: true, message: '进度已保存' });
});

// Get user progress
app.get('/api/progress/:username', (req, res) => {
    const { username } = req.params;
    const safeUsername = username.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    const userFile = getUserFilePath(safeUsername);

    if (!fs.existsSync(userFile)) {
        return res.status(404).json({ error: '用户不存在' });
    }

    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    res.json({
        success: true,
        progress: userData.progress
    });
});

// Save user notes/journal
app.post('/api/notes/:username', (req, res) => {
    const { username } = req.params;
    const { episodeId, noteType, content } = req.body;

    const safeUsername = username.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    const userFile = getUserFilePath(safeUsername);

    if (!fs.existsSync(userFile)) {
        return res.status(404).json({ error: '用户不存在' });
    }

    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));

    if (!userData.notes) userData.notes = {};
    if (!userData.notes[episodeId]) userData.notes[episodeId] = {};
    userData.notes[episodeId][noteType] = {
        content,
        updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    res.json({ success: true, message: '笔记已保存' });
});

// Get user notes
app.get('/api/notes/:username/:episodeId?', (req, res) => {
    const { username, episodeId } = req.params;
    const safeUsername = username.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    const userFile = getUserFilePath(safeUsername);

    if (!fs.existsSync(userFile)) {
        return res.status(404).json({ error: '用户不存在' });
    }

    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));

    if (episodeId) {
        res.json({
            success: true,
            notes: userData.notes?.[episodeId] || {}
        });
    } else {
        res.json({
            success: true,
            notes: userData.notes || {}
        });
    }
});

// Get content files
app.get('/api/content/:type/:episode/:file?', (req, res) => {
    const { type, episode, file } = req.params;
    let contentPath;

    if (type === 'episode') {
        // Main episode content
        const episodesDir = path.join(__dirname, 'episodes');
        const files = fs.readdirSync(episodesDir);
        const episodeFile = files.find(f => f.startsWith(`EP${episode.padStart(2, '0')}`));
        if (episodeFile) {
            contentPath = path.join(episodesDir, episodeFile);
        }
    } else if (type === 'deep-learning') {
        // Deep learning content
        const deepDir = path.join(__dirname, 'deep-learning', `EP${episode.padStart(2, '0')}`);
        if (file) {
            contentPath = path.join(deepDir, `${file}.md`);
        } else {
            // List available files
            if (fs.existsSync(deepDir)) {
                const files = fs.readdirSync(deepDir).map(f => f.replace('.md', ''));
                return res.json({ success: true, files });
            }
            return res.json({ success: true, files: [] });
        }
    } else if (type === 'ai-prompts') {
        // AI prompts
        const promptDir = path.join(__dirname, 'ai-prompts', `EP${episode.padStart(2, '0')}`);
        if (file) {
            contentPath = path.join(promptDir, `${file}.md`);
        } else {
            // List available files
            if (fs.existsSync(promptDir)) {
                const files = fs.readdirSync(promptDir).map(f => f.replace('.md', ''));
                return res.json({ success: true, files });
            }
            return res.json({ success: true, files: [] });
        }
    }

    if (contentPath && fs.existsSync(contentPath)) {
        const content = fs.readFileSync(contentPath, 'utf8');
        res.json({ success: true, content });
    } else {
        res.status(404).json({ error: '内容不存在' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║         52期投资学习系统 - 服务启动成功                  ║
╠════════════════════════════════════════════════════════╣
║  访问地址: http://localhost:${PORT}                       ║
║  API端点: http://localhost:${PORT}/api                    ║
╚════════════════════════════════════════════════════════╝
    `);
});
