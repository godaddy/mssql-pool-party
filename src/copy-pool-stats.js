/* eslint no-param-reassign: 0 */

const statKeys = ['healCount', 'promotionCount', 'retryCount'];

// this function mutates toPool
export default function copyPoolStats(fromPool, toPool) {
  statKeys.forEach((statKey) => {
    toPool[statKey] = fromPool[statKey];
  });
  return toPool;
}
