import { ErrorMapper } from "../libs/ErrorMapper/ErrorMapper";
import { ProcessPriority } from "./OS/kernel/constants";
import { Kernel } from "./OS/kernel/kernel";
import { HarvesterProcess } from "./creeps/harvester";

export const loop = ErrorMapper.wrapLoop(() => {
    let kernel = new Kernel();
    let p = kernel.addProcess(new HarvesterProcess(0, 0, ProcessPriority.LowPriority));
    console.log('Harvester created: ' + p.pid);
    console.log('Hello world!');
});