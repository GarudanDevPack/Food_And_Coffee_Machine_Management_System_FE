import { useEffect, useState } from "react";

export default function useLocalStorage<T>(
  key: string,
  initialValue: T,
  override: boolean = false,
) {
  // Always start with initialValue so server and client render identically (no hydration mismatch)
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // After mount, sync with the actual localStorage value
  useEffect(() => {
    if (override) return;
    try {
      const item = key ? window.localStorage.getItem(key) : null;
      if (!item) {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      } else {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStoredItem = () => {
    if (key) {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    }
  };

  useEffect(() => {
    window.addEventListener("storage", getStoredItem, false);
    return () => window.removeEventListener("storage", getStoredItem);
  }, []);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (key) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
