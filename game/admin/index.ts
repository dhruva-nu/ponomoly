import type { ClientAction } from "../protocol";
import { ADMIN_PASSWORD } from "../constants";
import type { ActionContext, HandlerError } from "../actions/context";
import { adminKick, adminMovePlayer, adminSetCash, adminSetTurn } from "./players";
import {
  adminClearForceDice,
  adminForceDice,
  adminReplaceState,
  adminSetBuildings,
  adminSetMortgage,
  adminSetOwner,
  adminSetPhase,
} from "./board";

type AdminAction = Extract<ClientAction, { type: "admin" }>;

/** Validate the password, then apply the requested admin command. Admin commands
 *  bypass turn/host/affordability rules. */
export function handleAdmin(ctx: ActionContext, action: AdminAction): HandlerError {
  if (action.password !== ADMIN_PASSWORD) return "Incorrect admin password.";

  const cmd = action.cmd;
  switch (cmd.kind) {
    case "forceDice":
      return adminForceDice(ctx, cmd);
    case "clearForceDice":
      return adminClearForceDice(ctx);
    case "setCash":
      return adminSetCash(ctx, cmd);
    case "movePlayer":
      return adminMovePlayer(ctx, cmd);
    case "setTurn":
      return adminSetTurn(ctx, cmd);
    case "setOwner":
      return adminSetOwner(ctx, cmd);
    case "setBuildings":
      return adminSetBuildings(ctx, cmd);
    case "setMortgage":
      return adminSetMortgage(ctx, cmd);
    case "kick":
      return adminKick(ctx, cmd);
    case "setPhase":
      return adminSetPhase(ctx, cmd);
    case "replaceState":
      return adminReplaceState(ctx, cmd);
  }
}
