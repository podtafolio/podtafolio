import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { H3Adapter } from "@bull-board/h3";
import { queues } from "../../utils/queue";
import { H3Event } from "h3";

const serverAdapter = new H3Adapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: Object.values(queues).map((q) => new BullMQAdapter(q)),
  serverAdapter,
});

const uiHandler = serverAdapter.registerHandlers();

export const redirectToBullboard = async (event: H3Event) => {
  return await uiHandler.handler(event);
};

export default defineEventHandler(redirectToBullboard);
