"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ChatUnreadValue = {
  count: number;
  refresh: () => Promise<void>;
};

const ChatUnreadContext = createContext<ChatUnreadValue>({
  count: 0,
  refresh: async () => undefined,
});

/**
 * One polling loop for every chat unread badge in the app. The count is seeded
 * by the server layout; updates are only fetched while the tab is visible.
 */
export function ChatUnreadProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch("/api/conversations/unread-count", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      setCount(Number(payload?.data?.count ?? 0));
    } catch {
      // Offline or API asleep: keep the last known count.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onChatUpdated = () => void refresh();
    const onPush = (event: MessageEvent) => {
      if (event.data?.type === "UNREAD_CHANGED") void refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("uniformity:chat-updated", onChatUpdated);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onPush);
    }

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("uniformity:chat-updated", onChatUpdated);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onPush);
      }
    };
  }, [refresh]);

  return (
    <ChatUnreadContext.Provider value={{ count, refresh }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
