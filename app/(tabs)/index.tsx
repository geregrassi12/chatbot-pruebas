"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollViewRef = useRef<HTMLDivElement>(null)

  const WEBHOOK_URL = "https://nas.disgroup.com.ar:30443/webhook/5b58c628-dda8-4b77-ac77-c50901496f47/chat"

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])
    const messageToSend = inputText.trim()
    setInputText("")
    setIsLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let responseData: string
      let botMessage: Message

      if (!response.ok) {
        // Handle different HTTP error codes
        let errorMessage: string

        switch (response.status) {
          case 400:
            errorMessage = "Bad request - The message format might be incorrect."
            break
          case 401:
            errorMessage = "Unauthorized - Authentication may be required."
            break
          case 403:
            errorMessage = "Forbidden - Access denied to the webhook."
            break
          case 404:
            errorMessage = "Webhook not found - Please check the URL."
            break
          case 500:
            errorMessage =
              "Server error - The n8n workflow encountered an issue. Please check your workflow configuration."
            break
          case 502:
            errorMessage = "Bad gateway - The webhook server is temporarily unavailable."
            break
          case 503:
            errorMessage = "Service unavailable - The webhook server is temporarily down."
            break
          case 504:
            errorMessage = "Gateway timeout - The webhook took too long to respond."
            break
          default:
            errorMessage = `HTTP error ${response.status} - ${response.statusText}`
        }

        // Try to get error details from response
        try {
          const errorText = await response.text()
          if (errorText) {
            errorMessage += `\n\nDetails: ${errorText}`
          }
        } catch (e) {
          // Ignore if we can't read the error response
        }

        botMessage = {
          id: (Date.now() + 1).toString(),
          text: errorMessage,
          isUser: false,
          timestamp: new Date(),
        }
      } else {
        // Success - get the response
        responseData = await response.text()

        botMessage = {
          id: (Date.now() + 1).toString(),
          text: responseData || "✅ Message sent successfully (no response content)",
          isUser: false,
          timestamp: new Date(),
        }
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Error sending message:", error)

      let errorMessage: string

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "⏱️ Request timeout - The webhook took too long to respond (30s limit)."
        } else if (error.message.includes("fetch")) {
          errorMessage = "🌐 Network error - Please check your internet connection and try again."
        } else if (error.message.includes("CORS")) {
          errorMessage = "🔒 CORS error - The webhook may not allow requests from this domain."
        } else {
          errorMessage = `❌ Error: ${error.message}`
        }
      } else {
        errorMessage = "❌ An unexpected error occurred. Please try again."
      }

      // Add error message to chat
      const errorBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorBotMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const retryLastMessage = () => {
    const lastUserMessage = messages.filter((m) => m.isUser).pop()
    if (lastUserMessage) {
      setInputText(lastUserMessage.text)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`mb-4 flex ${message.isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
          message.isUser
            ? "bg-blue-500 text-white rounded-br-md"
            : message.text.includes("❌") || message.text.includes("error") || message.text.includes("Error")
              ? "bg-red-50 text-red-800 border border-red-200 rounded-bl-md"
              : message.text.includes("⏱️") || message.text.includes("timeout")
                ? "bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-bl-md"
                : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
        }`}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap">{message.text}</p>
        <p
          className={`text-xs mt-1 ${
            message.isUser
              ? "text-blue-100 text-right"
              : message.text.includes("❌") || message.text.includes("error")
                ? "text-red-600"
                : message.text.includes("⏱️")
                  ? "text-yellow-600"
                  : "text-gray-500"
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {!message.isUser &&
          (message.text.includes("❌") || message.text.includes("error") || message.text.includes("Error")) && (
            <button
              onClick={retryLastMessage}
              className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
            >
              Retry Last Message
            </button>
          )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 py-4 border-b border-gray-200 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 text-center">n8n Chat Tester</h1>
        <p className="text-sm text-gray-600 text-center mt-1">Webhook Testing Interface</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div ref={scrollViewRef} className="flex-1 overflow-y-auto p-4" style={{ scrollBehavior: "smooth" }}>
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Welcome to n8n Chat Tester!</h2>
              <p className="text-gray-500 text-center">Send a message to start testing your chatbot</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}

          {isLoading && (
            <div className="flex items-center py-3">
              <p className="text-sm text-gray-500 italic">Bot is typing...</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-3 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              style={{ maxHeight: "100px", minHeight: "48px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold px-5 py-3 rounded-2xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
