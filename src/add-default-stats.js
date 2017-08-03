/* eslint no-param-reassign: 0 */
export default function addDefaultStats(pool) {
  // pool is mutated here to add stat properties
  pool.healCount = 0;
  pool.promotionCount = 0;
  pool.retryCount = 0;
  return pool;
}
