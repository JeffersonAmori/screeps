import { Process } from "./process";

declare global {
    interface Memory {
        pidCounter: number;
        processMemory: { [pid: number]: ProcessMemory }
        processTable: { [pid: number]: Process },
        kernelMemory: KernelMemory
    }
}

interface ProcessMemory {
    pid: number;
    parentPID: number;
    classPath: string;
    priority: number;
}

interface KernelMemory {
    shouldPrintProcess: boolean;
}
