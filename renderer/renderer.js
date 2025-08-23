// Cline Desktop Renderer Process
class ClineRenderer {
    constructor() {
        this.currentTask = null;
        this.isTaskRunning = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.setupEventListeners();
    }

    bindEvents() {
        // Task management
        document.getElementById('startTaskBtn').addEventListener('click', () => this.startTask());
        document.getElementById('clearInputBtn').addEventListener('click', () => this.clearInput());
        document.getElementById('pauseTaskBtn').addEventListener('click', () => this.pauseTask());
        document.getElementById('stopTaskBtn').addEventListener('click', () => this.stopTask());

        // Chat management
        document.getElementById('clearChatBtn').addEventListener('click', () => this.clearChat());

        // Tool approval
        document.getElementById('approveToolBtn').addEventListener('click', () => this.approveTool());
        document.getElementById('rejectToolBtn').addEventListener('click', () => this.rejectTool());

        // File diff
        document.getElementById('approveDiffBtn').addEventListener('click', () => this.approveDiff());
        document.getElementById('rejectDiffBtn').addEventListener('click', () => this.rejectDiff());

        // Logs
        document.getElementById('clearLogsBtn').addEventListener('click', () => this.clearLogs());
        document.getElementById('showLogsBtn').addEventListener('click', () => this.toggleLogs());

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => this.hideSettings());

        // Help
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        document.getElementById('closeHelpBtn').addEventListener('click', () => this.hideHelp());
        document.getElementById('closeHelpModalBtn').addEventListener('click', () => this.hideHelp());

        // Debug
        document.getElementById('debugBtn').addEventListener('click', () => this.debugTask());

        // Settings form
        document.getElementById('temperatureInput').addEventListener('input', (e) => {
            document.getElementById('temperatureValue').textContent = e.target.value;
        });
    }

    setupEventListeners() {
        // Listen for events from main process
        if (window.electronAPI) {
            window.electronAPI.onTaskUpdate((data) => this.handleTaskUpdate(data));
            window.electronAPI.onToolRequest((tool) => this.handleToolRequest(tool));
            window.electronAPI.onTaskComplete((result) => this.handleTaskComplete(result));
        }
    }

    async startTask() {
        const taskInput = document.getElementById('taskInput');
        const description = taskInput.value.trim();

        if (!description) {
            this.showMessage('Please enter a task description', 'warning');
            return;
        }

        try {
            this.setTaskRunning(true);
            this.showTaskStatus();
            this.addMessage('user', description);
            this.updateProgress(0, 'Starting task...');

            // Send task to main process
            const result = await window.electronAPI.startTask(description);
            
            if (result.success) {
                this.updateProgress(100, 'Task completed successfully');
                this.addMessage('assistant', result.output || 'Task completed successfully');
            } else {
                this.updateProgress(0, `Task failed: ${result.error}`);
                this.addMessage('error', `Task failed: ${result.error}`);
            }

        } catch (error) {
            console.error('Error starting task:', error);
            this.showMessage(`Error starting task: ${error.message}`, 'error');
            this.updateProgress(0, 'Task failed');
        } finally {
            this.setTaskRunning(false);
        }
    }

    async pauseTask() {
        try {
            // This would call the main process to pause the task
            this.updateProgress(this.getCurrentProgress(), 'Task paused');
            this.addMessage('system', 'Task paused by user');
        } catch (error) {
            console.error('Error pausing task:', error);
        }
    }

    async stopTask() {
        try {
            // This would call the main process to stop the task
            this.updateProgress(0, 'Task stopped');
            this.addMessage('system', 'Task stopped by user');
            this.setTaskRunning(false);
        } catch (error) {
            console.error('Error stopping task:', error);
        }
    }

    clearInput() {
        document.getElementById('taskInput').value = '';
    }

    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
    }

    clearLogs() {
        const logsContent = document.getElementById('logsContent');
        logsContent.innerHTML = '';
    }

    async approveTool() {
        try {
            const approved = await window.electronAPI.approveTool(this.currentTool);
            if (approved) {
                this.hideToolApproval();
                this.addMessage('system', 'Tool approved and executed');
            }
        } catch (error) {
            console.error('Error approving tool:', error);
        }
    }

    async rejectTool() {
        try {
            // This would call the main process to reject the tool
            this.hideToolApproval();
            this.addMessage('system', 'Tool rejected');
        } catch (error) {
            console.error('Error rejecting tool:', error);
        }
    }

    async approveDiff() {
        try {
            // This would call the main process to apply the file changes
            this.hideFileDiff();
            this.addMessage('system', 'File changes applied');
        } catch (error) {
            console.error('Error applying diff:', error);
        }
    }

    async rejectDiff() {
        try {
            // This would call the main process to reject the file changes
            this.hideFileDiff();
            this.addMessage('system', 'File changes rejected');
        } catch (error) {
            console.error('Error rejecting diff:', error);
        }
    }

    toggleLogs() {
        const logsSection = document.getElementById('logsSection');
        logsSection.classList.toggle('hidden');
    }

    showSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    showHelp() {
        document.getElementById('helpModal').classList.remove('hidden');
    }

    hideHelp() {
        document.getElementById('helpModal').classList.add('hidden');
    }

    async saveSettings() {
        try {
            const settings = {
                aiModel: document.getElementById('aiModelSelect').value,
                apiKey: document.getElementById('apiKeyInput').value,
                maxTokens: parseInt(document.getElementById('maxTokensInput').value),
                temperature: parseFloat(document.getElementById('temperatureInput').value),
                autoApprove: document.getElementById('autoApproveCheckbox').checked
            };

            // This would call the main process to save settings
            console.log('Settings saved:', settings);
            this.showMessage('Settings saved successfully', 'success');
            this.hideSettings();
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showMessage('Error saving settings', 'error');
        }
    }

    async debugTask() {
        try {
            const debugInfo = await window.electronAPI.getTaskStatus();
            console.log('Debug info:', debugInfo);
            this.addMessage('system', `Debug info: ${JSON.stringify(debugInfo, null, 2)}`);
        } catch (error) {
            console.error('Error getting debug info:', error);
        }
    }

    // UI State Management
    setTaskRunning(running) {
        this.isTaskRunning = running;
        const startBtn = document.getElementById('startTaskBtn');
        const pauseBtn = document.getElementById('pauseTaskBtn');
        const stopBtn = document.getElementById('stopTaskBtn');

        if (running) {
            startBtn.disabled = true;
            startBtn.textContent = '🚀 Task Running...';
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
        } else {
            startBtn.disabled = false;
            startBtn.innerHTML = '<span class="icon">🚀</span>Start Task';
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
        }
    }

    showTaskStatus() {
        document.getElementById('taskStatusSection').classList.remove('hidden');
    }

    hideTaskStatus() {
        document.getElementById('taskStatusSection').classList.add('hidden');
    }

    showChat() {
        document.getElementById('chatSection').classList.remove('hidden');
    }

    hideChat() {
        document.getElementById('chatSection').classList.add('hidden');
    }

    showToolApproval() {
        document.getElementById('toolApprovalSection').classList.remove('hidden');
    }

    hideToolApproval() {
        document.getElementById('toolApprovalSection').classList.add('hidden');
    }

    showFileDiff() {
        document.getElementById('fileDiffSection').classList.remove('hidden');
    }

    hideFileDiff() {
        document.getElementById('fileDiffSection').classList.add('hidden');
    }

    // Progress and Status Updates
    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const taskMessage = document.getElementById('taskMessage');

        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
        taskMessage.textContent = message;

        // Update status based on progress
        const taskStatus = document.getElementById('taskStatus');
        if (percentage === 0) {
            taskStatus.textContent = 'Ready';
        } else if (percentage === 100) {
            taskStatus.textContent = 'Completed';
        } else {
            taskStatus.textContent = 'Running';
        }
    }

    getCurrentProgress() {
        const progressText = document.getElementById('progressText');
        return parseInt(progressText.textContent) || 0;
    }

    // Message Management
    addMessage(type, content) {
        this.showChat();
        
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'timestamp';
        timestampDiv.textContent = timestamp;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(timestampDiv);
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Tool Request Handling
    handleToolRequest(tool) {
        this.currentTool = tool;
        
        document.getElementById('toolName').textContent = tool.name || 'Unknown Tool';
        document.getElementById('toolDescription').textContent = tool.description || 'No description available';
        document.getElementById('toolInput').textContent = JSON.stringify(tool.input || {}, null, 2);
        
        this.showToolApproval();
    }

    // File Diff Handling
    handleFileDiff(diffData) {
        document.getElementById('diffFilePath').textContent = diffData.filePath;
        document.getElementById('originalContent').textContent = diffData.original;
        document.getElementById('modifiedContent').textContent = diffData.modified;
        
        this.showFileDiff();
    }

    // Task Update Handling
    handleTaskUpdate(data) {
        if (data.progress !== undefined) {
            this.updateProgress(data.progress, data.message || 'Task in progress...');
        }
        
        if (data.status) {
            const taskStatus = document.getElementById('taskStatus');
            taskStatus.textContent = data.status;
        }
    }

    // Task Complete Handling
    handleTaskComplete(result) {
        this.setTaskRunning(false);
        this.updateProgress(100, 'Task completed');
        
        if (result.success) {
            this.addMessage('assistant', result.output || 'Task completed successfully');
        } else {
            this.addMessage('error', `Task failed: ${result.error}`);
        }
    }

    // Utility Functions
    showMessage(message, type = 'info') {
        // Create a temporary message display
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '1001';
        messageDiv.style.maxWidth = '300px';
        messageDiv.style.padding = '1rem';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    loadSettings() {
        // Load saved settings from localStorage or main process
        const savedSettings = localStorage.getItem('clineSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                document.getElementById('aiModelSelect').value = settings.aiModel || 'claude-3-sonnet';
                document.getElementById('apiKeyInput').value = settings.apiKey || '';
                document.getElementById('maxTokensInput').value = settings.maxTokens || 4000;
                document.getElementById('temperatureInput').value = settings.temperature || 0.7;
                document.getElementById('autoApproveCheckbox').checked = settings.autoApprove || false;
                document.getElementById('temperatureValue').textContent = settings.temperature || 0.7;
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
    }

    // Error Handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        this.showMessage(`Error: ${error.message}`, 'error');
    }
}

// Initialize the renderer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.clineRenderer = new ClineRenderer();
});

// Handle window errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.clineRenderer) {
        window.clineRenderer.handleError(event.error, 'global');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.clineRenderer) {
        window.clineRenderer.handleError(event.reason, 'promise');
    }
}); 