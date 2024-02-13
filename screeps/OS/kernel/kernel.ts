import { ProcessPriority } from "./constants";
import { ProcessStatus } from "./process-status";
// import { Process } from "../typings/process";
import { ProcessSleepByProcess, ProcessSleepByTime } from "OS/kernel/process";
import * as _ from 'lodash';
import { Process } from "./process";

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
  // _.mapKeys(Memory.processMemory, (value: any, key: string) => {
  //   if(processTable[key])
  //     return processTable[key];
  // });

  // Memory.processMemory = _.pick(Memory.processMemory, (_: any, key: string) => (processTable[key]));
  //Memory.processMemory = _.pickBy(Memory.processMemory, (p: Process) => !!processTable[p.pid]);
};

export let addProcess = function <T extends Process>(p: T, priority = ProcessPriority.LowPriority) {
  let pid = getFreePid();
  p.pid = pid;
  p.priority = priority;
  processTable[p.pid] = p;
  Memory.processMemory[pid] = {};
  p.setMemory(getProcessMemory(pid));
  p.status = ProcessStatus.ALIVE;
  return p;
};

export let addProcessIfNotExists = function <T extends Process>(p: T, priority = ProcessPriority.LowPriority) {
  let storedTable = Memory.processTable;
  for (let item of storedTable) {
    let [pid, parentPID, classPath, priority, ...remaining] = item;
    if (p.classPath() === classPath) {
      return processTable[pid];
    }
  }

  return addProcess(p, priority);
};

export let killProcess = function (pid: number) {
  if (pid === 0) {
    console.log("ABORT! ABORT! Why are you trying to kill init?!");
    return -1;
  }

  if (!processTable[pid])
    return -2;

  processTable[pid].status = ProcessStatus.DEAD;
  Memory.processMemory[pid] = undefined;

  // When a process is killed, we also need to kill all of its child processes
  console.log("Shutting down process with pid: " + pid + " - " + processTable[pid].classPath());
  for (let otherPid in processTable) {
    const process = processTable[pid];

    if ((process.parentPID === parseInt(otherPid, 10)) && (process.status !== ProcessStatus.DEAD)) {
      killProcess(process.pid);
    }
  }
  return pid;
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
  let aliveProcess = _.filter(_.values(processTable),
    (p: Process) => p.status !== ProcessStatus.DEAD);

  Memory.processTable = _.map(aliveProcess,
    (p: Process) => [p.pid, p.parentPID, p.constructor.name, p.priority, p.sleepInfo]);
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
  for (let item of storedTable) {
    let [pid, parentPID, classPath, priority, ...remaining] = item;
    try {
      // let processClass = processLookup.getProcess(classPath);
      // if (processClass === null) {
      //     console.log("Fail to lookup process: " + classPath);
      //     continue;
      // }
      let memory = getProcessMemory(pid);
      let p = eval(`new ${classPath}(${pid}, ${parentPID}, ${priority})`) as Process
      //let p = new processClass(pid, parentPID, priority) as Process;
      p.setMemory(memory);

      processTable[p.pid] = p;
      const sleepInfo = remaining.pop();
      if (sleepInfo) {
        p.sleepInfo = sleepInfo;

        p.status = ProcessStatus.SLEEP;
      }
      if (priority === ProcessPriority.Ticly) {
        ticlyQueue.push(p);
      }

      if (priority === ProcessPriority.TiclyLast) {
        ticlyLastQueue.push(p);
      }

      if (priority === ProcessPriority.LowPriority) {
        lowPriorityQueue.push(p);
      }

      if (Memory.kernelMemory.printProcess)
        console.log(`PID: ${p.pid} | ${String(classPath).padEnd(30)}\t| Status: ${p.status}\t| Priority: ${p.priority}\t| Memory: ${JSON.stringify(memory)}`);

    } catch (e: any) {
      console.log("Error when loading: " + classPath + ' | ' + e.message);
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
