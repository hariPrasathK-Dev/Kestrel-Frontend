"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { toast } from "react-toastify";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    tokensUsed?: number;
}

interface Conversation {
    _id: string;
    title: string;
    documentId?: { _id: string; fileName: string };
    updatedAt: string;
}

interface Document {
    _id: string;
    fileName: string;
    totalChunks: number;
    status: string;
    createdAt: string;
}

const GROQ_MODELS = [
    { id: "llama3-8b-8192", name: "LLaMA3 8B (Fast)", context: "8K context" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (Best)", context: "32K context" },
    { id: "gemma-7b-it", name: "Gemma 7B", context: "8K context" },
];

export default function LLMPage() {
    const { user } = useAuth();
    const [configured, setConfigured] = useState(false);
    const [selectedModel, setSelectedModel] = useState("llama3-8b-8192");
    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);
    const [showSetup, setShowSetup] = useState(false);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<string>("");

    const [question, setQuestion] = useState("");
    const [asking, setAsking] = useState(false);
    const [uploading, setUploading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadConfig();
        loadDocuments();
        loadConversations();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadConfig = async () => {
        try {
            const res = await api.get("/llm/config");
            setConfigured(res.data.configured);
            if (res.data.configured) {
                setSelectedModel(res.data.model);
            }
        } catch {
            setConfigured(false);
        }
    };

    const loadDocuments = async () => {
        try {
            const res = await api.get("/llm/documents");
            setDocuments(res.data.documents);
        } catch {
            /* ignore */
        }
    };

    const loadConversations = async () => {
        try {
            const res = await api.get("/llm/conversations");
            setConversations(res.data.conversations);
        } catch {
            /* ignore */
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey.trim()) return toast.error("API key is required");

        setSaving(true);
        try {
            await api.post("/llm/config", { apiKey, model: selectedModel });
            toast.success("Configuration saved! You can now use the AI assistant.");
            setConfigured(true);
            setShowSetup(false);
            setApiKey("");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Configuration failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            const res = await api.post("/llm/upload-document", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Document uploaded and processed!");
            loadDocuments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;
        if (!configured) {
            toast.error("Please configure your API key first");
            setShowSetup(true);
            return;
        }

        const userMessage: Message = {
            role: "user",
            content: question,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setQuestion("");
        setAsking(true);

        try {
            const res = await api.post("/llm/ask", {
                question: userMessage.content,
                documentId: selectedDocument || undefined,
                conversationId: currentConversation || undefined,
            });

            const assistantMessage: Message = {
                role: "assistant",
                content: res.data.answer,
                timestamp: new Date().toISOString(),
                tokensUsed: res.data.tokensUsed,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setCurrentConversation(res.data.conversationId);
            loadConversations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to get response");
            setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
        } finally {
            setAsking(false);
        }
    };

    const loadConversation = async (id: string) => {
        try {
            const res = await api.get(`/llm/conversations/${id}`);
            setCurrentConversation(id);
            setMessages(res.data.conversation.messages);
            if (res.data.conversation.documentId) {
                setSelectedDocument(res.data.conversation.documentId._id);
            }
        } catch {
            toast.error("Failed to load conversation");
        }
    };

    const startNewConversation = () => {
        setCurrentConversation(null);
        setMessages([]);
        setSelectedDocument("");
    };

    const deleteDocument = async (id: string) => {
        if (!confirm("Delete this document?")) return;
        try {
            await api.delete(`/llm/documents/${id}`);
            toast.success("Document deleted");
            loadDocuments();
        } catch {
            toast.error("Delete failed");
        }
    };

    return (
        <ProtectedRoute>
            <div className="app-shell">
                <Sidebar />
                <div className="main-content" style={{ background: "#f5f7fa" }}>
                    <div className="topbar">
                        <div>
                            <div className="topbar-title">🤖 AI Assistant</div>
                            <div className="topbar-subtitle">Powered by Groq - Ask questions about your documents</div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setShowSetup(true)}>
                                ⚙️ {configured ? "Reconfigure" : "Setup API"}
                            </button>
                            <button className="btn btn-primary" onClick={startNewConversation}>
                                + New Chat
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 280px", gap: 20, padding: "0 20px 20px", height: "calc(100vh - 140px)" }}>
                        {/* Conversations Sidebar */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div className="card" style={{ padding: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Recent Chats</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {conversations.map((conv) => (
                                        <button
                                            key={conv._id}
                                            onClick={() => loadConversation(conv._id)}
                                            style={{
                                                padding: "8px 10px",
                                                borderRadius: 6,
                                                border: "none",
                                                background: currentConversation === conv._id ? "#e8f5ee" : "#f9fafb",
                                                color: currentConversation === conv._id ? "#1a4731" : "#6b7280",
                                                fontSize: 12,
                                                textAlign: "left",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{conv.title}</div>
                                            {conv.documentId && <div style={{ fontSize: 10, opacity: 0.7 }}>📄 {conv.documentId.fileName}</div>}
                                        </button>
                                    ))}
                                    {conversations.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 20 }}>No conversations yet</p>}
                                </div>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                                {messages.length === 0 && (
                                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                                        <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Start a Conversation</h3>
                                        <p style={{ fontSize: 14 }}>
                                            Upload documents and ask questions, or just chat with the AI assistant
                                        </p>
                                    </div>
                                )}

                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                        }}
                                    >
                                        <div
                                            style={{
                                                maxWidth: "70%",
                                                padding: "12px 16px",
                                                borderRadius: 12,
                                                background: msg.role === "user" ? "#1a4731" : "#ffffff",
                                                color: msg.role === "user" ? "#ffffff" : "#1f2937",
                                                border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none",
                                                fontSize: 14,
                                                lineHeight: 1.6,
                                                whiteSpace: "pre-wrap",
                                                wordWrap: "break-word",
                                            }}
                                        >
                                            {msg.content}
                                            {msg.tokensUsed && (
                                                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 6 }}>
                                                    {msg.tokensUsed} tokens
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {asking && (
                                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                        <div
                                            style={{
                                                padding: "12px 16px",
                                                borderRadius: 12,
                                                background: "#ffffff",
                                                border: "1px solid #e5e7eb",
                                                fontSize: 14,
                                                color: "#9ca3af",
                                            }}
                                        >
                                            Thinking...
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleAskQuestion} style={{ padding: 16, borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                                {selectedDocument && (
                                    <div style={{ marginBottom: 8, fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>📄</span>
                                        <span>Context: {documents.find(d => d._id === selectedDocument)?.fileName}</span>
                                        <button type="button" onClick={() => setSelectedDocument("")} style={{ marginLeft: "auto", color: "#ef4444", border: "none", background: "none", cursor: "pointer" }}>
                                            ✕
                                        </button>
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input
                                        type="text"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder={configured ? "Ask a question..." : "Configure API key first"}
                                        disabled={!configured || asking}
                                        className="form-input"
                                        style={{ flex: 1 }}
                                    />
                                    <button type="submit" disabled={!configured || asking || !question.trim()} className="btn btn-primary">
                                        {asking ? "..." : "Send"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Documents Sidebar */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div className="card" style={{ padding: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Documents</div>
                                <input ref={fileInputRef} type="file" accept=".txt,.pdf,.csv" onChange={handleDocumentUpload} style={{ display: "none" }} />
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-sm btn-secondary" style={{ width: "100%", marginBottom: 12 }}>
                                    {uploading ? "Uploading..." : "+ Upload Document"}
                                </button>

                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {documents.map((doc) => (
                                        <div
                                            key={doc._id}
                                            style={{
                                                padding: "8px 10px",
                                                borderRadius: 6,
                                                background: selectedDocument === doc._id ? "#e8f5ee" : "#f9fafb",
                                                border: `1px solid ${selectedDocument === doc._id ? "#1a4731" : "#e5e7eb"}`,
                                                fontSize: 11,
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                                <button
                                                    onClick={() => setSelectedDocument(doc._id)}
                                                    style={{
                                                        flex: 1,
                                                        textAlign: "left",
                                                        border: "none",
                                                        background: "none",
                                                        cursor: "pointer",
                                                        padding: 0,
                                                        color: selectedDocument === doc._id ? "#1a4731" : "#374151",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {doc.fileName}
                                                </button>
                                                <button onClick={() => deleteDocument(doc._id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontSize: 12 }}>
                                                    🗑️
                                                </button>
                                            </div>
                                            <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>
                                                {doc.totalChunks} chunks • {doc.status}
                                            </div>
                                        </div>
                                    ))}
                                    {documents.length === 0 && <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: 20 }}>No documents uploaded</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Setup Modal */}
                    {showSetup && (
                        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                <div className="modal-header">
                                    <span className="modal-title">🔑 Configure Groq API</span>
                                    <button onClick={() => setShowSetup(false)} className="modal-close">
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleSaveConfig} style={{ padding: 20 }}>
                                    <div className="form-group">
                                        <label className="form-label">Select Model</label>
                                        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="form-input">
                                            {GROQ_MODELS.map((model) => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name} - {model.context}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Groq API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="gsk_..."
                                            className="form-input"
                                            required
                                        />
                                        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                                            Get your free API key from{" "}
                                            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: "#1a4731" }}>
                                                console.groq.com
                                            </a>
                                        </p>
                                    </div>

                                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                        <button type="button" onClick={() => setShowSetup(false)} className="btn btn-secondary">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={saving} className="btn btn-primary">
                                            {saving ? "Validating..." : "Save Configuration"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
