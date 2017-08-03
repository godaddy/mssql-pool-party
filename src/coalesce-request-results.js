// we should be able to ditch this with v4 mssql
export default function coalesceRequestResults(recordset) {
  // recordset can be undefined in node-mssql, i.e. performing a query that
  // does not return a recordset.
  // in v3 node-mssql, returnValue is not returned to query's promise-based
  // interface, so all we have to indicate a successful query when there is no
  // recordset is an undefined recordset parameter.
  // to avoid breaking everything downstream, we need to construct the same return
  // value, just with undefined values.
  if (!recordset) {
    return {
      recordset: undefined,
      returnValue: undefined,
    };
  }
  if (Object.prototype.hasOwnProperty.call(recordset, 'rowsAffected')) {
    return recordset;
  }
  return {
    recordset,
    returnValue: recordset.returnValue,
  };
}
