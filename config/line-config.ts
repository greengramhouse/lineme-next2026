// src/config/line.ts
import { messagingApi } from "@line/bot-sdk";

export const channelSecret = process.env.CHANNEL_SECRET || "";

export const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});

export const lineBlobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
});