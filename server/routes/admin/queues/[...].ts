import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { H3Adapter } from "@bull-board/h3";
import { queues } from "../../../utils/queue";

const serverAdapter = new H3Adapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: Object.values(queues).map((q) => new BullMQAdapter(q)),
  serverAdapter,
});

export default serverAdapter.registerHandlers();
