import { ProcessPriority } from "./constants";
import * as Kernel from "./kernel";
import { ProcessStatus } from "./process-status";

type ConcreteProcess = { new(pid: number, parentPid: number, priority?: ProcessPriority): Process };
type DependencyInfo = [ConcreteProcess, ProcessSetupCallback];
type ProcessSetupCallback = (p: Process) => void;

export abstract class Process {
  public status: ProcessStatus;
  public abstract classPath(): string;
  public sleepInfo?: ProcessSleepByTime | ProcessSleepByProcess;
  public memory: any;
  public deps: DependencyInfo[] = [];
  public kernel = Kernel;

  constructor(
    public pid: number,
    public parentPID: number,
    public priority = ProcessPriority.LowPriority
  ) {
    this.pid = pid;
    this.parentPID = parentPID;
    this.status = ProcessStatus.ALIVE;
    this.priority = priority;
  }

  public abstract run(): number;

  public setMemory(memory: any): void {
    this.memory = memory;
  }

  public stop(signal: number) {
    this.kernel.killProcess(this.pid);
    return signal;
  }

  public abstract setup(..._: any[]): Process;

  public registerDependency(
    p: ConcreteProcess,
    processSetup: ProcessSetupCallback
  ) {
    let dependencyInfo: DependencyInfo = [p, processSetup];
    this.deps.push(dependencyInfo);
  }

  public runDeps() {
    let deps = (this.memory.deps = this.memory.deps || {});
    for (let dep of this.deps) {
      let [processClass, callback] = dep;
      let t = new processClass(0, 0, 1);
      let classPath = t.classPath();
      if (
        !deps[classPath] ||
        !Kernel.getProcessById(deps[classPath])
      ) {
        let p = new processClass(0, this.pid);
        this.kernel.addProcess(p);
        callback.bind(this)(p);
        deps[classPath] = p.pid;
      }
    }
  }

  public suicide(): void {
    this.kernel.killProcess(this.pid);
  }

  public fallAsleepByTime(ticks: number): void {
    this.kernel.sleepProcessByTime(this, ticks);
  }

  public fallAsleepByProcess(p: Process): void {
    this.kernel.sleepProcessByProcess(this, p);
  }
}

const data: any = {};
export let Lookup = {
  addProcess: function (p: typeof Process) {
    data[p.name] = p;
  },
  getProcess: function (id: string): any | null {
    return data[id];
  },
};

export class ProcessSleepByTime {
  start: number = 0;
  duration: number = -1;
}

export class ProcessSleepByProcess {
  pid: number = -1;
}
