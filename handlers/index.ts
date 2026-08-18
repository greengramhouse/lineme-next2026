// src/handlers/index.ts
import { webhook } from "@line/bot-sdk";
import { handleMessageEvent } from "./messageHandler";
import { handleFollowEvent } from "./followHandler";
import { handleUnfollowEvent } from "./unfollowHandler";
import { handleAccountLinkEvent } from "./accountLinkHandler";

export async function handleLineEvent(event : webhook.Event) {
  switch (event.type) {
    case "message":
      return handleMessageEvent(event);
    case "follow":
      return handleFollowEvent(event);
    case "unfollow":
      return handleUnfollowEvent(event);
    // ปลายทางของการลงทะเบียนผ่านเว็บ — event เดียวที่ให้ replyToken มาโดยผู้ใช้ไม่ได้พิมพ์อะไร
    case "accountLink":
      return handleAccountLinkEvent(event);
    // case "postback": 
    //   return handlePostbackEvent(event);
    default:
      return;
  }
}