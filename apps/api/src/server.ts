import { createApp } from "./app.js";
import { resolveBindHost } from "./server-binding.js";
const port=Number(process.env.PORT ?? "3000");
const host=resolveBindHost(process.env.HOST,process.env.ALLOW_PRIVATE_NETWORK_BIND);
createApp().listen(port,host,()=>console.log(`ProInvest API listening on ${host}:${port}`));
