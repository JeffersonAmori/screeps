import { ProcessPriority } from "./constants";
import { ProcessStatus } from "./process-status";
import { ProcessSleepByProcess, ProcessSleepByTime } from "OS/kernel/process";
import { Process } from "./process";
import * as _ from 'lodash';

let ticlyQueue: Process[] = [];
let ticlyLastQueue: Process[] = [];
let lowPriorityQueue: Process[] = [];

type ProcessTable = { [pid: string]: Process };

export let processTable: ProcessTable = {};

export let reboot = function () {
    ticlyQueue = [];
    ticlyLastQueue = [];
    lowPriorityQueue = [];
    processTable = {};
};

let getFreePid = function () {
    Memory.pidCounter = Memory.pidCounter || 0;
    while (getProcessById(Memory.pidCounter)) {
        Memory.pidCounter += 1;
    }
    return Memory.pidCounter;
};

export let garbageCollection = function () {
    for (let pid in Memory.processMemory) {
        if (!processTable[pid]) {
            console.log("Cleaning up process memory for pid: " + pid);
            delete Memory.processMemory[pid];
        }
    }
};

export let addProcess = function <T extends Process>(p: T, priority = ProcessPriority.LowPriority) {
    p.pid = getFreePid();
    p.status = ProcessStatus.ALIVE;
    p.priority = priority;
    processTable[p.pid] = p;

    if (priority === ProcessPriority.Ticly) {
        ticlyQueue.push(p);
    }

    if (priority === ProcessPriority.TiclyLast) {
        ticlyLastQueue.push(p);
    }

    if (priority === ProcessPriority.LowPriority) {
        lowPriorityQueue.push(p);
    }

    return p;
};

export let addProcessIfNotExists = function <T extends Process>(p: T, priority = ProcessPriority.LowPriority) {
    if (!processTable[p.pid]) {
        addProcess(p, priority);
    }
    return p;
};

export let killProcess = function (pid: number) {
    let p = getProcessById(pid);
    if (p) {
        p.status = ProcessStatus.DEAD;
    }
    return p;
};

export let forkProcess = function (origin: Process, newProcess: Process): Process {
    console.log(`forking process ${origin.classPath()} to process ${newProcess.classPath()}`);
    newProcess = addProcess(newProcess);
    newProcess.parentPID = origin.pid;
    console.log(`new process: ${newProcess.classPath()} - ${newProcess.pid}`);
    sleepProcessByProcess(origin, newProcess);
    return newProcess;
};

export let sleepProcessByTime = function (p: Process, ticks: number): Process {
    return sleepProcess(p, { start: Game.time, duration: ticks });
};

export let sleepProcessByProcess = function (p: Process, p2: Process): Process {
    return sleepProcess(p, { pid: p2.pid });
};

export let sleepProcess = function (p: Process, sleepInfo: ProcessSleepByTime | ProcessSleepByProcess): Process {
    p.status = ProcessStatus.SLEEP;
    p.sleepInfo = sleepInfo;
    return p;
};

export let getProcessById = function (pid: number): Process | null {
    return processTable[pid];
};

export let storeProcessTable = function () {

};

export let getProcessMemory = function (pid: number) {
    Memory.processMemory = Memory.processMemory || {};
    Memory.processMemory[pid] = Memory.processMemory[pid] || {};
    return Memory.processMemory[pid];
};

let runOneQueue = function (queue: Process[]) {
    while (queue.length > 0) {
        let process = queue.pop();
        while (process) {
            try {
                if (process.parentPID > 0) {
                    let parent = getProcessById(process.parentPID);
                    if (!parent) {
                        killProcess(process.pid);
                    }
                }
                // if (process.status === ProcessStatus.SLEEP) {
                //   if (((((<ProcessSleepByTime>process.sleepInfo)!.start + (<ProcessSleepByTime>process.sleepInfo)!.duration) < Game.time) && (<ProcessSleepByTime>process.sleepInfo)!.duration !== -1) ||
                //     ((<ProcessSleepByProcess>process.sleepInfo) && !processTable[(<ProcessSleepByProcess>process.sleepInfo).pid] && !(<ProcessSleepByTime>process.sleepInfo)!.duration)) {
                //     process.status = ProcessStatus.ALIVE;
                //     process.sleepInfo = undefined;
                //   }
                // }
                if (process.status === ProcessStatus.ALIVE) {
                    process.run();
                }
            } catch (e: any) {
                console.log("Fail to run process: " + process.pid + " [" + process.classPath() + "]");
                console.log("Message: " + e.message);
                console.log("Stack: " + e.stack);
            }
            process = queue.pop();
        }
    }
}

export let run = function () {
    runOneQueue(ticlyQueue);
    runOneQueue(ticlyLastQueue);
    runOneQueue(lowPriorityQueue);
};

export let loadProcessTable = function () {
    reboot();
    Memory.processTable = Memory.processTable || [];
    let storedTable = Memory.processTable;
    for (let [pid, process] of Object.entries(storedTable)) {
        try {
            // let processClass = processLookup.getProcess(classPath);
            // if (processClass === null) {
            //     console.log("Fail to lookup process: " + classPath);
            //     continue;
            // }
            let memory = getProcessMemory(process.pid);
            let p = eval(`new ${process.classPath}(${pid}, ${process.parentPID}, ${process.priority})`) as Process
            p.setMemory(memory);

            processTable[p.pid] = p;
            const sleepInfo = process.sleepInfo;
            if (sleepInfo) {
                p.sleepInfo = sleepInfo;

                p.status = ProcessStatus.SLEEP;
            }
            if (process.priority === ProcessPriority.Ticly) {
                ticlyQueue.push(p);
            }

            if (process.priority === ProcessPriority.TiclyLast) {
                ticlyLastQueue.push(p);
            }

            if (process.priority === ProcessPriority.LowPriority) {
                lowPriorityQueue.push(p);
            }

            if (Memory.kernelMemory.shouldPrintProcess)
                console.log(`PID: ${p.pid} | ${String(p.classPath).padEnd(30)}\t| Status: ${p.status}\t| Priority: ${p.priority}\t| Memory: ${JSON.stringify(memory)}`);

        } catch (e: any) {
            console.log("Error when loading: " + process.classPath + ' | ' + e.message);
        }
    }
};

export let resetProcessTable = function () {
    processTable = {};
};

export let getChildProcess = function (p: Process) {
    var result: Process[] = [];
    for (let i in processTable) {
        var process = processTable[i];
        if (process.parentPID === p.pid) {
            result.push(process);
        }
    }
    return result;
};
