import { Process } from "OS/kernel/process";
import "libs/Traveler/Traveler";
import { Consts } from "../consts";
import * as _ from 'lodash';

export class HarvesterProcess extends Process {
  private _creep: Creep | null = null;

  public classPath(): string {
    return "HarvesterProcess";
  }

  // _[0] - creepId
  public setup(..._: any[]) {
    this.memory.creepId = _[0];
    return this;
  }

  /** @param {Creep} creep **/
  public run(): number {
    this._creep = Game.getObjectById<Creep>(this.memory.creepId);
    if (!this._creep) {
      this.kernel.killProcess(this.pid);
      return -1;
    }

    if (this._creep.store.getUsedCapacity(RESOURCE_ENERGY) === this._creep.store.getCapacity(RESOURCE_ENERGY)) {

      this._creep.say('transfering');
      this._creep.memory.working = false;
      if (this.memory.Role !== Consts.roleHarvester)
        this.kernel.killProcess(this.pid);
    }

    if (this._creep.memory.working) {
      let dropedEnergy = this._creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
      if (dropedEnergy) {
        if (this._creep.pickup(dropedEnergy) === ERR_NOT_IN_RANGE) {
          this._creep.travelTo(dropedEnergy);
        }
      } else {
        let source = this._creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
        if (!source) {
          return -1;
        }

        if (this._creep.harvest(source) === ERR_NOT_IN_RANGE) {
          this._creep.travelTo(source);
        }
      }
    }
    else {
      let target: Structure | null = null;
      if (!this._creep.memory.otherResources) {
        let otherResources = _.filter(RESOURCES_ALL, r => r !== RESOURCE_ENERGY && this._creep && this._creep.store.getUsedCapacity(r) > 0) as ResourceConstant[]
        this._creep.memory.otherResources = otherResources;
      }

      if (this._creep.memory.otherResources.length > 0) {
        target = this._creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_STORAGE) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        })
      }

      if (!target) {
        target = this._creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_TOWER) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        });
      }

      if (!target) {
        target = this._creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        });
      }

      if (!target) {
        target = this._creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (//structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType === STRUCTURE_STORAGE) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
          }
        });
      }
      if (target) {
        if (this._creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this._creep.travelTo(target);
        }

        if (this._creep.memory.otherResources) {
          this._creep.memory.otherResources.forEach(oR => {
            if (!this._creep || !target || !this._creep.memory.otherResources)
              return;

            this._creep.transfer(target, oR);
            _.pull(this._creep.memory.otherResources, oR);
          });
        }

        if (this._creep.store.getUsedCapacity() === 0) {
          this._creep.say('harvesting');
          this._creep.memory.working = true;
          if (this.memory.Role !== Consts.roleHarvester)
            this.kernel.killProcess(this.pid);
        }
      }
    }

    return 0;
  }
};
