import { ProcessPriority } from "./constants";
import { ProcessStatus } from "./process-status";
import { ProcessSleepByProcess, ProcessSleepByTime } from "./process";
import { Process } from "./process";
import * as _ from 'lodash';
import { HarvesterProcess } from "../../creeps/harvester";

export class Kernel {
    ticlyQueue: Process[] = [];
    ticlyLastQueue: Process[] = [];
    lowPriorityQueue: Process[] = [];
    processTable: { [pid: string]: Process } = {};

    processClasses: { [key: string]: any } = {
        'HarvesterProcess': HarvesterProcess
        // Add other classes here
    };


    reboot() {
        this.ticlyQueue = [];
        this.ticlyLastQueue = [];
        this.lowPriorityQueue = [];
        this.processTable = {};
    }

    getFreePid() {
        Memory.pidCounter = Memory.pidCounter || 0;
        while (this.getProcessById(Memory.pidCounter)) {
            Memory.pidCounter += 1;
        }
        return Memory.pidCounter;
    }

    garbageCollection() {
        for (let pid in Memory.processMemory) {
            if (!this.processTable[pid]) {
                console.log("Cleaning up process memory for pid: " + pid);
                delete Memory.processMemory[pid];
            }
        }
    }

    addProcess<T extends Process>(p: T, priority = ProcessPriority.LowPriority) {
        p.pid = this.getFreePid();
        p.status = ProcessStatus.ALIVE;
        p.priority = priority;
        this.processTable[p.pid] = p;

        if (priority === ProcessPriority.Ticly) {
            this.ticlyQueue.push(p);
        }

        if (priority === ProcessPriority.TiclyLast) {
            this.ticlyLastQueue.push(p);
        }

        if (priority === ProcessPriority.LowPriority) {
            this.lowPriorityQueue.push(p);
        }

        return p;
    }

    addProcessIfNotExists<T extends Process>(p: T, priority = ProcessPriority.LowPriority) {
        if (!this.processTable[p.pid]) {
            this.addProcess(p, priority);
        }
        return p;
    }

    killProcess(pid: number) {
        let p = this.getProcessById(pid);
        if (p) {
            p.status = ProcessStatus.DEAD;
        }
        return p;
    }

    forkProcess(origin: Process, newProcess: Process): Process {
        console.log(`forking process ${origin.classPath()} to process ${newProcess.classPath()}`);
        newProcess = this.addProcess(newProcess);
        newProcess.parentPID = origin.pid;
        console.log(`new process: ${newProcess.classPath()} - ${newProcess.pid}`);
        this.sleepProcessByProcess(origin, newProcess);
        return newProcess;
    }

    sleepProcessByTime(p: Process, ticks: number): Process {
        return this.sleepProcess(p, { start: Game.time, duration: ticks });
    }

    sleepProcessByProcess(p: Process, p2: Process): Process {
        return this.sleepProcess(p, { pid: p2.pid });
    }

    sleepProcess(p: Process, sleepInfo: ProcessSleepByTime | ProcessSleepByProcess): Process {
        p.status = ProcessStatus.SLEEP;
        p.sleepInfo = sleepInfo;
        return p;
    }

    getProcessById(pid: number): Process | null {
        return this.processTable[pid];
    }

    storeProcessTable() {

    }

    getProcessMemory(pid: number) {
        Memory.processMemory = Memory.processMemory || {};
        Memory.processMemory[pid] = Memory.processMemory[pid] || {};
        return Memory.processMemory[pid];
    }

    runOneQueue(queue: Process[]) {
        while (queue.length > 0) {
            let process = queue.pop();
            while (process) {
                try {
                    if (process.parentPID > 0) {
                        let parent = this.getProcessById(process.parentPID);
                        if (!parent) {
                            this.killProcess(process.pid);
                        }
                    }
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

    run() {
        this.runOneQueue(this.ticlyQueue);
        this.runOneQueue(this.ticlyLastQueue);
        this.runOneQueue(this.lowPriorityQueue);
    }

    loadProcessTable() {
        this.reboot();
        Memory.processTable = Memory.processTable || [];
        let storedTable = Memory.processTable;
        for (let [pid, process] of Object.entries(storedTable)) {
            try {
                let memory = this.getProcessMemory(process.pid);
                let ProcessConstructor = this.processClasses[process.classPath()];
                if (ProcessConstructor) {
                    let p = new ProcessConstructor(pid, process.parentPID, process.priority) as Process;
                    p.setMemory(memory);

                    this.processTable[p.pid] = p;
                    const sleepInfo = process.sleepInfo;
                    if (sleepInfo) {
                        p.sleepInfo = sleepInfo;

                        p.status = ProcessStatus.SLEEP;
                    }
                    if (process.priority === ProcessPriority.Ticly) {
                        this.ticlyQueue.push(p);
                    }

                    if (process.priority === ProcessPriority.TiclyLast) {
                        this.ticlyLastQueue.push(p);
                    }

                    if (process.priority === ProcessPriority.LowPriority) {
                        this.lowPriorityQueue.push(p);
                    }

                    if (Memory.kernelMemory.shouldPrintProcess)
                        console.log(`PID: ${p.pid} | ${String(p.classPath).padEnd(30)}\t| Status: ${p.status}\t| Priority: ${p.priority}\t| Memory: ${JSON.stringify(memory)}`);

                } else {
                    console.error(`Unknown process class: ${process.classPath}`);
                }
            } catch (e: any) {
                console.log("Error when loading: " + process.classPath + ' | ' + e.message);
            }
        }
    }


    resetProcessTable() {
        this.processTable = {};
    }

    getChildProcess(p: Process) {
        var result: Process[] = [];
        for (let i in this.processTable) {
            var process = this.processTable[i];
            if (process.parentPID === p.pid) {
                result.push(process);
            }
        }
        return result;
    }
}
