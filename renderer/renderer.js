// Cline AI Agent - Conversational Interface
class ClineAIRenderer {
  constructor() {
    this.conversationHistory = [];
    this.isAIProcessing = false;
    this.currentToolCall = null;
    this.settings = {
      model: "claude-3-sonnet-20240229",
      apiKey: "",
      baseUrl: "",
      maxTokens: 4000,
      temperature: 0.7,
      streaming: true,
      autoApproveRead: false,
      autoApproveList: false,
      confirmDangerous: true,
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSettings();
    this.setupEventListeners();

    // Command output listener disabled for cleaner UI
    // this.setupCommandOutputListener();
    this.initializeUI();
  }

  bindEvents() {
    // Message input and sending
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    messageInput.addEventListener("input", () => this.handleInputChange());
    messageInput.addEventListener("keydown", (e) => this.handleKeyDown(e));
    sendBtn.addEventListener("click", () => this.sendMessage());

    // Suggestion buttons
    document.querySelectorAll(".suggestion-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt");
        this.fillInputAndSend(prompt);
      });
    });

    // Chat management
    document
      .getElementById("clearChatBtn")
      .addEventListener("click", () => this.clearConversation());
    document
      .getElementById("exportChatBtn")
      .addEventListener("click", () => this.exportConversation());

    // Continuous reasoning control
    document
      .getElementById("stopReasoningBtn")
      .addEventListener("click", () => this.stopContinuousReasoning());

    // Tool approval
    document
      .getElementById("approveToolBtn")
      .addEventListener("click", () => this.approveTool());
    document
      .getElementById("rejectToolBtn")
      .addEventListener("click", () => this.rejectTool());

    // Settings
    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.showSettings());
    document
      .getElementById("closeSettingsBtn")
      .addEventListener("click", () => this.hideSettings());
    document
      .getElementById("saveSettingsBtn")
      .addEventListener("click", () => this.saveSettings());
    document
      .getElementById("cancelSettingsBtn")
      .addEventListener("click", () => this.hideSettings());

    // Settings tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.switchTab(btn.getAttribute("data-tab")),
      );
    });

    // Help
    document
      .getElementById("helpBtn")
      .addEventListener("click", () => this.showHelp());
    document
      .getElementById("closeHelpBtn")
      .addEventListener("click", () => this.hideHelp());
    document
      .getElementById("closeHelpModalBtn")
      .addEventListener("click", () => this.hideHelp());

    // Settings form
    document
      .getElementById("temperatureInput")
      .addEventListener("input", (e) => {
        document.getElementById("temperatureValue").textContent =
          e.target.value;
      });

    // AI Model selection handler
    document.getElementById("aiModelSelect").addEventListener("change", (e) => {
      this.handleModelChange(e.target.value);
    });

    // File attachment
    document
      .getElementById("attachBtn")
      .addEventListener("click", () => this.attachFile());
  }

  setupEventListeners() {
    // Listen for events from main process
    if (window.electronAPI) {
      window.electronAPI.onAIResponse((response) =>
        this.handleAIResponse(response),
      );
      window.electronAPI.onToolCallRequest((toolCall) =>
        this.handleToolCallRequest(toolCall),
      );
      window.electronAPI.onClineMessage((message) =>
        this.handleClineMessage(message),
      );
    }
  }

  initializeUI() {
    this.updateAIStatus();
    // Esperar un poco antes de cargar el historial para asegurar que los handlers estén registrados
    setTimeout(() => {
      this.loadConversationHistory();
    }, 1000);

    // Start periodic check for continuous reasoning status
    this.startContinuousReasoningCheck();
  }

  startContinuousReasoningCheck() {
    // Check every 2 seconds if continuous reasoning is active
    setInterval(() => {
      this.checkContinuousReasoningStatus();
    }, 2000);
  }

  // ===== MESSAGE HANDLING =====

  handleInputChange() {
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const charCount = document.getElementById("charCount");

    const text = messageInput.value.trim();
    const length = messageInput.value.length;

    charCount.textContent = length;
    sendBtn.disabled = !text || this.isAIProcessing;

    // Auto-resize textarea
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
  }

  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!this.isAIProcessing) {
        this.sendMessage();
      }
    }
  }

  async sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    console.log(
      "📝 [UI] User attempting to send message:",
      message.substring(0, 100) + "...",
    );

    if (!message || this.isAIProcessing) {
      console.log("⚠️ [UI] Message blocked - empty message or AI processing");
      return;
    }

    try {
      console.log("🚀 [UI] Starting message send process");
      // Clear input and show user message
      messageInput.value = "";
      this.handleInputChange();
      this.addMessage("user", message);
      this.showTypingIndicator("🔍 Analizando tu solicitud...");
      this.setAIProcessing(true);

      // Hide welcome section and show chat
      this.showChatSection();

      // Update status with more detailed reasoning indicators
      setTimeout(
        () => this.updateTypingMessage("🧠 Analizando tu solicitud..."),
        500,
      );
      setTimeout(
        () =>
          this.updateTypingMessage(
            "🔍 Determinando qué herramientas necesito...",
          ),
        1500,
      );
      setTimeout(
        () => this.updateTypingMessage("🤖 Generando respuesta..."),
        2500,
      );

      console.log("🌐 [UI] Sending message to AI via electronAPI");
      // Send message to AI
      const response = await window.electronAPI.sendAIMessage(message);

      console.log("📨 [UI] Received response from AI:", {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        hasError: !!response?.error,
        hasToolCalls: !!response?.toolCalls,
        toolCallsCount: response?.toolCalls?.length || 0,
      });

      this.hideTypingIndicator();

      if (response && response.content) {
        console.log("✅ [UI] Adding assistant message to chat");
        this.addMessage("assistant", response.content);
      } else if (response && response.error) {
        console.error("❌ [UI] AI returned error:", response.error);
        this.addMessage("error", `Error: ${response.error}`);
      } else {
        console.warn("⚠️ [UI] No content or error in response:", response);
      }
      // Eliminamos los mensajes del sistema para conversación natural

      // Handle tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(
          "🔧 [UI] Processing tool calls:",
          response.toolCalls.length,
        );
        for (const toolCall of response.toolCalls) {
          if (toolCall.requiresApproval) {
            console.log(
              "🔒 [UI] Tool requires approval:",
              toolCall.function?.name,
            );
            this.showToolApproval(toolCall);
          } else {
            console.log(
              "⚡ [UI] Auto-executing safe tool:",
              toolCall.function?.name,
            );
            // Auto-execute safe tools
            await this.executeToolCall(toolCall);
          }
        }
      } else {
        console.log("ℹ️ [UI] No tool calls in response");
      }
    } catch (error) {
      console.error("❌ [UI] Error sending message:", error);
      console.error("❌ [UI] Error details:", {
        message: error.message,
        stack: error.stack,
        userMessage: message.substring(0, 200),
      });
      this.hideTypingIndicator();
      this.addMessage("error", `Error: ${error.message}`);
    } finally {
      console.log("🏁 [UI] Message send process completed");
      this.setAIProcessing(false);
    }
  }

  fillInputAndSend(prompt) {
    const messageInput = document.getElementById("messageInput");
    messageInput.value = prompt;
    this.handleInputChange();
    this.sendMessage();
  }

  // ===== UI MANAGEMENT =====

  showChatSection() {
    document.getElementById("welcomeSection").classList.add("hidden");
    document.getElementById("chatSection").classList.remove("hidden");
  }

  showWelcomeSection() {
    document.getElementById("welcomeSection").classList.remove("hidden");
    document.getElementById("chatSection").classList.add("hidden");
  }

  showTypingIndicator(message = "🤖 El asistente está procesando...") {
    const indicator = document.getElementById("typingIndicator");
    indicator.classList.remove("hidden");

    // Update the message if there's a text element
    const messageElement = indicator.querySelector(".typing-text");
    if (messageElement) {
      messageElement.textContent = message;
    }

    this.scrollToBottom();
  }

  hideTypingIndicator() {
    document.getElementById("typingIndicator").classList.add("hidden");
  }

  updateTypingMessage(message) {
    const indicator = document.getElementById("typingIndicator");
    const messageElement = indicator.querySelector(".typing-text");
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  setAIProcessing(processing) {
    this.isAIProcessing = processing;
    const sendBtn = document.getElementById("sendBtn");
    const messageInput = document.getElementById("messageInput");

    sendBtn.disabled = processing || !messageInput.value.trim();
    messageInput.disabled = processing;

    this.updateAIStatus();
  }

  updateAIStatus() {
    const statusDot = document.getElementById("aiStatus");
    const statusText = document.getElementById("aiStatusText");

    if (this.isAIProcessing) {
      statusDot.className = "status-dot processing";
      statusText.textContent = "Processing...";
    } else if (this.settings.apiKey) {
      statusDot.className = "status-dot online";
      statusText.textContent = "Ready";
    } else {
      statusDot.className = "status-dot offline";
      statusText.textContent = "Configure API Key";
    }
  }

  // ===== MESSAGE DISPLAY =====

  /**
   * Mantener tipo original - el backend ya maneja la clasificación correctamente
   */
  detectMessageTypeSemantics(content, originalType) {
    return originalType;
  }

  /**
   * NO USAR - Los mensajes ya vienen correctamente tipados desde el backend
   */
  isReasoningMessage(content) {
    return false; // No usar patrones - confiar en el backend
  }

  /**
   * NO USAR - Los mensajes ya vienen correctamente tipados desde el backend
   */
  isToolExecutionMessage(content) {
    return false; // No usar patrones - confiar en el backend
  }

  /**
   * Clasifica el tipo de mensaje usando comprensión semántica por LLM
   * NO usa patrones - usa inteligencia artificial para entender el contenido
   */
  async classifyMessageType(content, originalType) {
    // Si no es un mensaje del asistente, mantener el tipo original
    if (originalType !== "assistant") {
      return originalType;
    }

    try {
      // Usar LLM para entender semánticamente el contenido
      const classificationPrompt = `
Analiza este mensaje y determina su tipo basándote en su SIGNIFICADO e INTENCIÓN, no en palabras específicas:

Mensaje: "${content}"

¿Qué tipo de mensaje es este?
- "reasoning": Si explica el proceso de pensamiento, razonamiento o análisis
- "tool-execution": Si describe la ejecución de herramientas o comandos
- "assistant": Si es una respuesta normal del asistente

Responde SOLO con una palabra: reasoning, tool-execution, o assistant`;

      // Llamar al LLM para clasificación semántica
      const response =
        await window.electronAPI.sendAIMessage(classificationPrompt);

      if (response && response.content) {
        const classification = response.content.trim().toLowerCase();
        if (
          ["reasoning", "tool-execution", "assistant"].includes(classification)
        ) {
          return classification;
        }
      }
    } catch (error) {
      console.log(
        "Error en clasificación semántica, usando tipo original:",
        error,
      );
    }

    // Fallback al tipo original si hay error
    return originalType;
  }

  addMessage(type, content, metadata = {}) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");

    // Detectar tipos especiales usando comprensión semántica simple
    let currentType = this.detectMessageTypeSemantics(content, type);

    // Agregar clases adicionales basadas en metadatos
    let messageClasses = `message ${currentType}`;
    if (metadata.isOriginal) messageClasses += " original-response";
    if (metadata.isCorrected) messageClasses += " corrected-response";
    if (metadata.isCorrection) messageClasses += " correction-notice";
    if (metadata.wasAnalyzed) messageClasses += " analyzed-response";

    messageDiv.className = messageClasses;

    const timestamp = new Date().toLocaleTimeString();

    let avatar = "";
    if (type === "user") {
      avatar = '<div class="message-avatar user-avatar">👤</div>';
    } else if (type === "assistant") {
      avatar = '<div class="message-avatar ai-avatar">🤖</div>';
    } else if (type === "reasoning") {
      avatar = '<div class="message-avatar reasoning-avatar">🧠</div>';
    } else if (type === "tool-execution") {
      avatar = '<div class="message-avatar tool-avatar">🔧</div>';
    } else if (type === "system") {
      avatar = '<div class="message-avatar system-avatar">⚙️</div>';
    } else if (type === "error") {
      avatar = '<div class="message-avatar error-avatar">❌</div>';
    }

    // Generar badges adicionales para respuestas del SelfReflectiveAI
    let badges = "";
    if (metadata.wasAnalyzed) {
      badges += '<span class="message-badge analyzed">🧠 Analizada</span>';
    }
    if (metadata.isCorrected) {
      badges += `<span class="message-badge corrected">🔧 Corregida (${metadata.correctionType})</span>`;
    }
    if (metadata.isOriginal && metadata.wasCorrected) {
      badges +=
        '<span class="message-badge original">📝 Respuesta Original</span>';
    }

    messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${this.getSenderName(type, metadata)}</span>
                    <span class="message-time">${timestamp}</span>
                    ${badges}
                </div>
                <div class="message-text">${this.formatMessageContent(content, type)}</div>
                ${metadata.toolCall ? this.renderToolCallInfo(metadata.toolCall) : ""}
            </div>
        `;

    chatMessages.appendChild(messageDiv);
    this.scrollToBottom();

    // Store in conversation history
    this.conversationHistory.push({
      type: currentType,
      content,
      timestamp: new Date(),
      metadata,
    });

    // Clasificación semántica asíncrona para mensajes del asistente
    // DESHABILITADO temporalmente para evitar loops infinitos
    // if (type === 'assistant') {
    //     this.classifyAndUpdateMessageType(messageDiv, content, currentType);
    // }
  }

  /**
   * Clasifica y actualiza el tipo de mensaje de forma asíncrona usando LLM
   */
  async classifyAndUpdateMessageType(messageDiv, content, originalType) {
    try {
      const semanticType = await this.classifyMessageType(
        content,
        originalType,
      );

      if (semanticType !== originalType) {
        // Actualizar las clases CSS del mensaje
        messageDiv.className = messageDiv.className.replace(
          `message ${originalType}`,
          `message ${semanticType}`,
        );

        // Actualizar el avatar si es necesario
        const avatar = messageDiv.querySelector(".message-avatar");
        if (avatar) {
          if (semanticType === "reasoning") {
            avatar.textContent = "🧠";
            avatar.className = "message-avatar reasoning-avatar";
          } else if (semanticType === "tool-execution") {
            avatar.textContent = "🔧";
            avatar.className = "message-avatar tool-avatar";
          }
        }

        // Actualizar el nombre del sender
        const senderElement = messageDiv.querySelector(".message-sender");
        if (senderElement) {
          senderElement.textContent = this.getSenderName(semanticType);
        }
      }
    } catch (error) {
      console.log("Error en clasificación semántica asíncrona:", error);
    }
  }

  getSenderName(type, metadata = {}) {
    switch (type) {
      case "user":
        return "You";
      case "assistant":
        if (metadata.wasAnalyzed) {
          return "AI Assistant (Self-Reflective)";
        }
        return "AI Assistant";
      case "reasoning":
        return "AI Reasoning";
      case "tool-execution":
        return "Tool Execution";
      case "system":
        if (metadata.isCorrection) {
          return "Auto-Correction";
        }
        return "System";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  }

  formatMessageContent(content, type) {
    if (type === "error") {
      return `<div class="error-content">${this.escapeHtml(content)}</div>`;
    }

    // Basic markdown-like formatting
    let formatted = this.escapeHtml(content);

    // Code blocks
    formatted = formatted.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (match, lang, code) => {
        return `<div class="code-block">
                ${lang ? `<div class="code-lang">${lang}</div>` : ""}
                <pre><code>${code.trim()}</code></pre>
                <button class="copy-btn" onclick="this.copyCode(this)">📋 Copy</button>
            </div>`;
      },
    );

    // Inline code
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="inline-code">$1</code>',
    );

    // Bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic text
    formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Line breaks
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }

  formatFollowupQuestion(content) {
    try {
      const questionData = JSON.parse(content);
      const { question, options } = questionData;

      let html = `<div class="followup-question">
                <div class="question-text">${this.escapeHtml(question)}</div>`;

      if (options && options.length > 0) {
        html += `<div class="question-options">`;
        options.forEach((option, index) => {
          html += `<button class="option-btn" onclick="renderer.answerFollowupQuestion('${this.escapeHtml(option)}')">${this.escapeHtml(option)}</button>`;
        });
        html += `</div>`;
      } else {
        // No options provided, show text input
        html += `<div class="question-input">
                    <input type="text" id="followupInput" placeholder="Type your answer..." />
                    <button onclick="renderer.answerFollowupQuestion(document.getElementById('followupInput').value)">Send</button>
                </div>`;
      }

      html += `</div>`;
      return html;
    } catch (error) {
      // Fallback if JSON parsing fails
      return `<div class="followup-question">
                <div class="question-text">${this.escapeHtml(content)}</div>
                <div class="question-input">
                    <input type="text" id="followupInput" placeholder="Type your answer..." />
                    <button onclick="renderer.answerFollowupQuestion(document.getElementById('followupInput').value)">Send</button>
                </div>
            </div>`;
    }
  }

  async answerFollowupQuestion(answer) {
    if (!answer || answer.trim() === "") return;

    // Add user's answer to chat
    this.addMessage("user", answer.trim());

    // Send answer to backend
    try {
      const response = await window.electronAPI.sendAIMessage(answer.trim());

      if (response && response.content) {
        this.addMessage("assistant", response.content);
      } else if (response && response.success) {
        this.addMessage("system", "Answer received. Processing...");
      }
    } catch (error) {
      console.error("Error sending followup answer:", error);
      this.addMessage("error", `Error: ${error.message}`);
    }

    // Clear input if it exists
    const input = document.getElementById("followupInput");
    if (input) {
      input.value = "";
    }
  }

  renderToolCallInfo(toolCall) {
    return `
            <div class="tool-call-info">
                <div class="tool-call-header">
                    <span class="icon">🔧</span>
                    <span>Tool: ${toolCall.name}</span>
                </div>
                <div class="tool-call-description">${toolCall.description}</div>
            </div>
        `;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ===== TOOL MANAGEMENT =====

  showToolApproval(toolCall) {
    this.currentToolCall = toolCall;

    document.getElementById("toolName").textContent = toolCall.name;
    document.getElementById("toolDescription").textContent =
      toolCall.description;
    document.getElementById("toolParameters").textContent = JSON.stringify(
      toolCall.parameters,
      null,
      2,
    );

    document.getElementById("toolApprovalSection").classList.remove("hidden");
    this.scrollToBottom();
  }

  hideToolApproval() {
    document.getElementById("toolApprovalSection").classList.add("hidden");
    this.currentToolCall = null;
  }

  async approveTool() {
    if (!this.currentToolCall) return;

    try {
      this.hideToolApproval();
      this.addMessage(
        "system",
        `Executing tool: ${this.currentToolCall.name}`,
        {
          toolCall: this.currentToolCall,
        },
      );

      const result = await window.electronAPI.approveToolCall(
        this.currentToolCall.id,
      );
      this.addMessage("system", `Tool result: ${result}`);
    } catch (error) {
      console.error("Error approving tool:", error);
      this.addMessage("error", `Tool execution failed: ${error.message}`);
    }
  }

  async rejectTool() {
    if (!this.currentToolCall) return;

    try {
      await window.electronAPI.rejectTool(this.currentToolCall.id);
      this.hideToolApproval();
      this.addMessage("system", `Tool rejected: ${this.currentToolCall.name}`);
    } catch (error) {
      console.error("Error rejecting tool:", error);
    }
  }

  async executeToolCall(toolCall) {
    try {
      const result = await window.electronAPI.approveToolCall(toolCall.id);
      this.addMessage("system", `Auto-executed ${toolCall.name}: ${result}`);
    } catch (error) {
      console.error("Error executing tool:", error);
      this.addMessage("error", `Tool execution failed: ${error.message}`);
    }
  }

  // ===== CONVERSATION MANAGEMENT =====

  async clearConversation() {
    try {
      await window.electronAPI.clearConversation();
      document.getElementById("chatMessages").innerHTML = "";
      this.conversationHistory = [];
      this.showWelcomeSection();
    } catch (error) {
      console.error("Error clearing conversation:", error);
    }
  }

  async loadConversationHistory() {
    try {
      // Verificar que electronAPI esté disponible
      if (!window.electronAPI || !window.electronAPI.getConversationHistory) {
        console.log("ElectronAPI not ready yet, skipping history load");
        return;
      }

      const history = await window.electronAPI.getConversationHistory();
      if (history && history.length > 1) {
        // More than just system message
        this.showChatSection();
        history.forEach((msg) => {
          if (msg.role !== "system") {
            this.addMessage(
              msg.role === "user" ? "user" : "assistant",
              msg.content,
            );
          }
        });
      }
    } catch (error) {
      console.warn(
        "Could not load conversation history (this is normal on first startup):",
        error.message,
      );
    }
  }

  exportConversation() {
    const data = {
      timestamp: new Date().toISOString(),
      messages: this.conversationHistory,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `cline-conversation-${new Date().toISOString().split("T")[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async stopContinuousReasoning() {
    try {
      console.log("🛑 [UI] Stop continuous reasoning requested");

      const result = await window.electronAPI.invoke(
        "stop-continuous-reasoning",
      );

      if (result.success) {
        this.showNotification("Razonamiento continuo detenido", "success");
        this.updateStopButtonVisibility(false);
      }
    } catch (error) {
      console.error("Error stopping continuous reasoning:", error);
      this.showNotification(
        "Error al detener el razonamiento continuo",
        "error",
      );
    }
  }

  async checkContinuousReasoningStatus() {
    try {
      const result = await window.electronAPI.invoke(
        "is-continuous-reasoning-active",
      );
      this.updateStopButtonVisibility(result.active);
    } catch (error) {
      console.error("Error checking continuous reasoning status:", error);
    }
  }

  updateStopButtonVisibility(isActive) {
    const stopBtn = document.getElementById("stopReasoningBtn");
    if (stopBtn) {
      if (isActive) {
        stopBtn.style.display = "inline-flex";
        stopBtn.classList.add("pulse");
      } else {
        stopBtn.style.display = "none";
        stopBtn.classList.remove("pulse");
      }
    }
  }

  // ===== SETTINGS MANAGEMENT =====

  showSettings() {
    this.loadCurrentSettings();
    document.getElementById("settingsModal").classList.remove("hidden");
  }

  hideSettings() {
    document.getElementById("settingsModal").classList.add("hidden");
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === tabName + "Tab");
    });
  }

  async loadCurrentSettings() {
    try {
      const config = await window.electronAPI.getAIConfig();
      if (config) {
        const selectedModel = config.model || "claude-3-sonnet-20240229";
        document.getElementById("aiModelSelect").value = selectedModel;
        document.getElementById("apiKeyInput").value = config.apiKey || "";
        document.getElementById("baseUrlInput").value = config.baseUrl || "";
        document.getElementById("authHeaderInput").value =
          config.authHeader || "";
        document.getElementById("maxTokensInput").value =
          config.maxTokens || 4000;
        document.getElementById("temperatureInput").value =
          config.temperature || 0.7;
        document.getElementById("temperatureValue").textContent =
          config.temperature || 0.7;
        // Safety settings
        document.getElementById("autoApproveReadCheckbox").checked =
          config.autoApproveRead || false;
        document.getElementById("autoApproveListCheckbox").checked =
          config.autoApproveList || false;
        document.getElementById("confirmDangerousCheckbox").checked =
          config.confirmDangerous !== false;

        // Trigger model change handler to show/hide fields as needed
        this.handleModelChange(selectedModel);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async saveSettings() {
    try {
      const selectedModel = document.getElementById("aiModelSelect").value;
      const apiKey = document.getElementById("apiKeyInput").value;
      const baseUrl = document.getElementById("baseUrlInput").value;
      const authHeader = document.getElementById("authHeaderInput").value;

      // Validation for o3 (Custom) model
      if (
        selectedModel === "o3" ||
        selectedModel.startsWith("o3-") ||
        selectedModel === "o4-mini"
      ) {
        if (!baseUrl.trim()) {
          this.showMessage(
            "Base URL is required for o3 (Custom) model",
            "error",
          );
          return;
        }
      }

      // Determine provider based on model
      let provider = "anthropic";
      if (selectedModel.startsWith("gpt-")) {
        provider = "openai-native";
      } else if (
        selectedModel === "o3" ||
        selectedModel.startsWith("o3-") ||
        selectedModel === "o4-mini"
      ) {
        provider = "genai";
      }

      const config = {
        model: selectedModel,
        provider: provider,
        apiKey: apiKey,
        baseUrl: baseUrl,
        authHeader: authHeader,
        maxTokens: parseInt(document.getElementById("maxTokensInput").value),
        temperature: parseFloat(
          document.getElementById("temperatureInput").value,
        ),
        // Safety settings
        autoApproveRead: document.getElementById("autoApproveReadCheckbox")
          .checked,
        autoApproveList: document.getElementById("autoApproveListCheckbox")
          .checked,
        confirmDangerous: document.getElementById("confirmDangerousCheckbox")
          .checked,
      };

      await window.electronAPI.updateAIConfig(config);
      this.settings = { ...this.settings, ...config };
      this.updateAIStatus();
      this.hideSettings();
      this.showMessage("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showMessage("Error saving settings", "error");
    }
  }

  handleModelChange(selectedModel) {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const baseUrlInput = document.getElementById("baseUrlInput");
    const authHeaderGroup = document.getElementById("authHeaderGroup");
    const authHeaderInput = document.getElementById("authHeaderInput");

    // Show/hide Authentication Header field based on model selection
    if (
      selectedModel === "o3" ||
      selectedModel.startsWith("o3-") ||
      selectedModel === "o4-mini"
    ) {
      // Show authentication header field for o3 (Custom)
      authHeaderGroup.style.display = "block";

      // Make Base URL required for o3 (Custom)
      baseUrlInput.placeholder =
        "https://your-custom-api-endpoint.com (Required for o3 Custom)";
      baseUrlInput.required = true;

      // Update labels and placeholders for custom model
      document.querySelector('label[for="baseUrlInput"]').textContent =
        "Base URL (Required):";

      // Update API Key field for custom model context
      apiKeyInput.placeholder =
        "Enter header value (Bearer token, api-key, etc.)";
      document.querySelector(
        "small",
        document.querySelector('label[for="apiKeyInput"]').parentElement,
      ).textContent =
        "Value for the authentication header. Optional if no authentication needed.";

      console.log("o3 (Custom) selected - showing authentication header field");
    } else {
      // Hide authentication header field for other models
      authHeaderGroup.style.display = "none";

      // Set appropriate placeholder based on model type
      if (selectedModel.startsWith("gpt-")) {
        // OpenAI models
        baseUrlInput.placeholder = "https://api.openai.com/v1";
      } else if (selectedModel.startsWith("claude-")) {
        // Anthropic models
        baseUrlInput.placeholder = "https://api.anthropic.com";
      } else {
        // Generic placeholder for other models
        baseUrlInput.placeholder = "Enter API base URL";
      }

      baseUrlInput.required = false;

      // Reset labels for other models
      document.querySelector('label[for="baseUrlInput"]').textContent =
        "Base URL (Optional):";

      // Reset API Key field for standard models
      apiKeyInput.placeholder = "Enter your API key";
      document.querySelector(
        "small",
        document.querySelector('label[for="apiKeyInput"]').parentElement,
      ).textContent = "Your API key is stored securely and never shared.";

      console.log(
        "Standard model selected - hiding authentication header field",
      );
    }
  }

  loadSettings() {
    // TEMPORARY: Clear localStorage to reset to default config
    localStorage.removeItem("clineSettings");
    console.log("localStorage cleared - using default configuration");

    const saved = localStorage.getItem("clineSettings");
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
  }

  // ===== HELP =====

  showHelp() {
    document.getElementById("helpModal").classList.remove("hidden");
  }

  hideHelp() {
    document.getElementById("helpModal").classList.add("hidden");
  }

  // ===== FILE ATTACHMENT =====

  async attachFile() {
    try {
      const result = await window.electronAPI.selectFiles({
        properties: ["openFile"],
        filters: [
          {
            name: "Text Files",
            extensions: [
              "txt",
              "md",
              "js",
              "ts",
              "py",
              "java",
              "cpp",
              "c",
              "html",
              "css",
              "json",
            ],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileName = filePath.split("/").pop();

        // Add file reference to input
        const messageInput = document.getElementById("messageInput");
        const currentValue = messageInput.value;
        messageInput.value = `${currentValue}\n\n[Attached file: ${fileName}]\nPlease analyze this file: ${filePath}`;
        this.handleInputChange();
      }
    } catch (error) {
      console.error("Error attaching file:", error);
      this.showMessage("Error attaching file", "error");
    }
  }

  // ===== EVENT HANDLERS =====

  handleAIResponse(response) {
    console.log("🤖 [Renderer] Received AI response:", {
      hasContent: !!response.content,
      wasAnalyzed: response.wasAnalyzed,
      hasCorrection: !!response.correction,
      hasOriginalResponse: !!response.originalResponse,
    });

    if (response.content) {
      // Si es una respuesta del SelfReflectiveAI con corrección
      if (
        response.wasAnalyzed &&
        response.correction &&
        response.originalResponse
      ) {
        console.log(
          "🧠 [Renderer] Displaying SelfReflectiveAI response with correction",
        );

        // Mostrar la respuesta original si fue corregida
        if (
          response.correctedResponse &&
          response.correctedResponse !== response.originalResponse
        ) {
          this.addMessage("assistant", response.originalResponse, {
            isOriginal: true,
            wasCorrected: true,
          });

          // Agregar separador visual
          this.addMessage("system", "🔧 Auto-corrección aplicada:", {
            isCorrection: true,
          });

          // Mostrar la respuesta corregida
          this.addMessage("assistant", response.correctedResponse, {
            isCorrected: true,
            correctionType: response.correction.correctionType,
          });
        } else {
          // Solo mostrar la respuesta final
          this.addMessage("assistant", response.content, {
            wasAnalyzed: true,
            analysisScore: response.analysis?.confidence || 0,
          });
        }
      } else {
        // Respuesta normal
        this.addMessage("assistant", response.content, {
          wasAnalyzed: response.wasAnalyzed || false,
        });
      }
    }

    // Finalizar el procesamiento
    this.setAIProcessing(false);
  }

  handleToolCallRequest(toolCall) {
    if (toolCall.requiresApproval) {
      this.showToolApproval(toolCall);
    }
  }

  handleClineMessage(message) {
    // Handle different types of Cline messages
    // Eliminamos el manejo de 'followup' para conversación natural
    if (message.type === "say") {
      // Handle different say types
      switch (message.say) {
        case "tool":
          this.addMessage("system", message.text);
          break;
        case "error":
          this.addMessage("error", message.text);
          break;
        default:
          this.addMessage("assistant", message.text);
      }
    }
  }

  // ===== COMMAND OUTPUT STREAMING =====

  setupCommandOutputListener() {
    // Listen for real-time command output from the main process
    window.electronAPI.onCommandOutput((data) => {
      const { command, output, isComplete, exitCode } = data;

      if (!isComplete) {
        // Real-time output - add to current message or create new one
        this.addCommandOutput(output);
      } else {
        // Command completed
        const statusMessage =
          exitCode === 0
            ? "completed successfully"
            : `failed with exit code ${exitCode}`;
        this.addMessage("system", `Command ${statusMessage}: ${command}`);
      }
    });
  }

  addCommandOutput(output) {
    // Find the last message in the chat
    const chatMessages = document.getElementById("chatMessages");
    const lastMessage = chatMessages.lastElementChild;

    // If the last message is a command output message, append to it
    if (lastMessage && lastMessage.classList.contains("command-output")) {
      const contentDiv = lastMessage.querySelector(".message-content");
      contentDiv.textContent += output + "\n";
    } else {
      // Create a new command output message
      const messageDiv = document.createElement("div");
      messageDiv.className = "message system command-output";
      messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-role">Command Output</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${output}</div>
            `;
      chatMessages.appendChild(messageDiv);
    }

    this.scrollToBottom();
  }

  // ===== UTILITY FUNCTIONS =====

  showMessage(message, type = "info") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `toast toast-${type}`;
    messageDiv.innerHTML = `
            <span class="toast-icon">${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span>
            <span class="toast-message">${message}</span>
        `;

    document.body.appendChild(messageDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // Copy code functionality
  copyCode(button) {
    const codeBlock = button.parentNode.querySelector("code");
    const text = codeBlock.textContent;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        button.textContent = "✅ Copied!";
        setTimeout(() => {
          button.innerHTML = "📋 Copy";
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy code:", err);
      });
  }
}

// Initialize the renderer when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.clineAI = new ClineAIRenderer();
  window.renderer = window.clineAI; // Make renderer available globally for followup questions
});

// Handle window errors
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  if (window.clineAI) {
    window.clineAI.showMessage("An unexpected error occurred", "error");
  }
});

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  if (window.clineAI) {
    window.clineAI.showMessage("An unexpected error occurred", "error");
  }
});

// Make copyCode available globally for the copy buttons
window.copyCode = function (button) {
  if (window.clineAI) {
    window.clineAI.copyCode(button);
  }
};
