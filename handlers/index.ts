// src/handlers/index.ts
import { webhook } from "@line/bot-sdk";
import { handleMessageEvent } from "./messageHandler";
import { handleFollowEvent } from "./followHandler";

export async function handleLineEvent(event : webhook.Event) {
  switch (event.type) {
    case "message":
      return handleMessageEvent(event);
    case "follow":
      return handleFollowEvent(event);
    // case "postback": 
    //   return handlePostbackEvent(event);
    default:
      return;
  }
}