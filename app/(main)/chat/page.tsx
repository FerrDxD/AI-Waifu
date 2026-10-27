import ChatClient from '@/features/chat/ChatClient';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/chat/ChatClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 */
export default function Page() {
  return <ChatClient />;
}
