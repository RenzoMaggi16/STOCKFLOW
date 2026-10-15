import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createSession, type Tokens } from "./session";
let memory: Tokens | null = null;
let lost = () => {};
// Web es una vista de desarrollo: sesión solamente en memoria. Android usa SecureStore.
const storage = {
  read: async () =>
    Platform.OS === "web"
      ? memory
      : JSON.parse(
          (await SecureStore.getItemAsync("stockflow.session")) || "null",
        ),
  write: async (tokens: Tokens | null) => {
    if (Platform.OS === "web") {
      memory = tokens;
      return;
    }
    if (tokens)
      await SecureStore.setItemAsync(
        "stockflow.session",
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      );
    else await SecureStore.deleteItemAsync("stockflow.session");
  },
};
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000/api";
export const session = createSession(API_URL, storage, () => lost());
export const api = session.api;
export const onSessionLost = (callback: () => void) => {
  lost = callback;
};
