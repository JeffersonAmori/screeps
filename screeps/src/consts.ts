export class Consts {
    // Population control.
    public static maxNumberHarvester = 0;
    public static maxNumberUpgrader = 1;
    public static maxNumberBuilder = 2;
    public static maxNumberRepairer = 1;
    public static maxNumberCarrier = 2;
    public static maxNumberPioneer = 3;
    public static maxNumberPillager = 1;
    public static maxNumberSoldier = 1;
    public static maxNumberDiplomats = 1;
    public static maxNumberCarrierTeleporter = 1;
    public static maxNumberMeleeFightersForAnotherRoom = 3;
    // Roles.
    public static roleBuilder = 'builder';
    public static roleCarrier = 'carrier';
    public static roleCarrierTeleporter = 'carrierTeleporter';
    public static roleHarvester = 'harvester';
    public static roleMiner = 'miner';
    public static roleMinerLinker = 'minerLinker';
    public static roleRepairer = 'repairer';
    public static roleUpgrader = 'upgrader';
    public static rolePioneer = 'pioneer';
    public static rolePillager = 'pillager';
    public static roleSoldier = 'soldier';
    public static rolefighterHealer = 'harvester';
    public static roleFighterMelee = 'meleeFighter';
    public static roleFighterMeleeForAnotherRoom = 'meleeFighterForAnotherRoom';
    public static roleFighterRanged = 'rangedFighter';
    public static roleDiplomat = 'diplomat';
    // Room config.
    public static roomLevelCanCreatePioneers = 4;
    public static roomLevelCanReceivePioneers = 3;
    // Creep repair.
    public static minTicksBeforeRepairing = 50;
    public static minTicksBeforeSpawningReplacement = 50;
    public static shouldRenewCreeps = false;
    // Misc.
    public static garbageCollectionInterval = 100;
    public static towerRepairSleepTimer = 100;
};
