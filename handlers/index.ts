// src/handlers/index.ts
import { webhook } from "@line/bot-sdk";
import { handleMessageEvent } from "./messageHandler";
import { handleFollowEvent } from "./followHandler";
import { handleUnfollowEvent } from "./unfollowHandler";

export async function handleLineEvent(event : webhook.Event) {
  switch (event.type) {
    case "message":
      return handleMessageEvent(event);
    case "follow":
      return handleFollowEvent(event);
    case "unfollow":
      return handleUnfollowEvent(event);
    // case "postback": 
    //   return handlePostbackEvent(event);
    default:
      return;
  }
}