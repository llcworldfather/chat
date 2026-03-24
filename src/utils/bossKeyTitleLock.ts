/** 老板键开启时阻止未读标题逻辑覆盖标签页标题 */
let bossKeyTitleLocked = false;

export function setBossKeyTitleLocked(locked: boolean): void {
    bossKeyTitleLocked = locked;
}

export function isBossKeyTitleLocked(): boolean {
    return bossKeyTitleLocked;
}
