export const SIZE_MODIFICATION_IDS = {
  REGULAR: 21,
  LARGE: 22,
};

export const SIZE_SWAP_INVENTORY_IDS = {
  MEDIUM_CUP: 40,
  LARGE_CUP: 41,
  MEDIUM_LID: 42,
  LARGE_LID: 43,
};

export const MODIFICATION_INVENTORY_USAGE = new Map([
  [11, { inventoryId: 24, quantityUsed: 1 }], // Add Tapioca Pearls
  [12, { inventoryId: 25, quantityUsed: 1 }], // Add Crystal Boba
  [13, { inventoryId: 26, quantityUsed: 1 }], // Add Popping Boba (Strawberry)
  [14, { inventoryId: 27, quantityUsed: 1 }], // Add Popping Boba (Mango)
  [15, { inventoryId: 28, quantityUsed: 1 }], // Add Honey Jelly
  [16, { inventoryId: 29, quantityUsed: 1 }], // Add Lychee Jelly
  [17, { inventoryId: 30, quantityUsed: 1 }], // Add Coffee Jelly
  [18, { inventoryId: 31, quantityUsed: 1 }], // Add Pudding
  [19, { inventoryId: 32, quantityUsed: 1 }], // Add Ice Cream
  [20, { inventoryId: 33, quantityUsed: 1 }], // Add Creama
]);

export function addInventoryUsage(usageMap, inventoryId, quantity) {
  if (!Number.isFinite(quantity) || quantity === 0) return;
  usageMap.set(inventoryId, (usageMap.get(inventoryId) || 0) + quantity);
}

export function applySizeInventorySwap(perUnitUsage, targetSize) {
  const { MEDIUM_CUP, LARGE_CUP, MEDIUM_LID, LARGE_LID } = SIZE_SWAP_INVENTORY_IDS;

  if (targetSize === "large") {
    const mediumCupQty = perUnitUsage.get(MEDIUM_CUP) || 0;
    const mediumLidQty = perUnitUsage.get(MEDIUM_LID) || 0;
    if (mediumCupQty > 0) {
      addInventoryUsage(perUnitUsage, MEDIUM_CUP, -mediumCupQty);
      addInventoryUsage(perUnitUsage, LARGE_CUP, mediumCupQty);
    }
    if (mediumLidQty > 0) {
      addInventoryUsage(perUnitUsage, MEDIUM_LID, -mediumLidQty);
      addInventoryUsage(perUnitUsage, LARGE_LID, mediumLidQty);
    }
    return;
  }

  if (targetSize === "regular") {
    const largeCupQty = perUnitUsage.get(LARGE_CUP) || 0;
    const largeLidQty = perUnitUsage.get(LARGE_LID) || 0;
    if (largeCupQty > 0) {
      addInventoryUsage(perUnitUsage, LARGE_CUP, -largeCupQty);
      addInventoryUsage(perUnitUsage, MEDIUM_CUP, largeCupQty);
    }
    if (largeLidQty > 0) {
      addInventoryUsage(perUnitUsage, LARGE_LID, -largeLidQty);
      addInventoryUsage(perUnitUsage, MEDIUM_LID, largeLidQty);
    }
  }
}
