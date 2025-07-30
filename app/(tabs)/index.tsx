"use client";
import { useEffect } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

export default function Chat() {
  useEffect(() => {
    createChat({
      webhookUrl: 'https://nas.disgroup.com.ar:30443/webhook/5b58c628-dda8-4b77-ac77-c50901496f47/chat',
      target: '#n8n-chat',
      mode: 'fullscreen',
      showWelcomeScreen: true,
      initialMessages: [
        'Hola 👋',
        'Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      ],
      i18n: {
        en: {
          title: '¡Hola! 👋',
          subtitle: 'Estoy listo para ayudarte con lo que necesites.',
          inputPlaceholder: 'Escribí tu mensaje...',
          getStarted: 'Empezar conversación',
        },
      },
    });
  }, []);

return <div id="n8n-chat" style={{ height: '100vh' }} />;
