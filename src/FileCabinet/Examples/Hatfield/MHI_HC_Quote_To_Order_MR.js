/* eslint-disable max-len */
/* eslint-disable no-plusplus */

/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['underscore', 'N/record', 'N/runtime'], (_, record, runtime) => {
  /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
  const getInputData = () => {
    log.debug('Process Started');

    const orderObj = JSON.parse(runtime.getCurrentScript().getParameter({
      name: 'custscript_mhi_order'
    }));

    log.debug('Order Object', runtime.getCurrentScript().getParameter({
      name: 'custscript_mhi_order'
    }));

    const {
      salesOrderId, lines
    } = orderObj;

    for (let a = 0; a < lines.length; a++) {
      lines[a].salesOrderId = salesOrderId;
    }

    return lines;
  };

  /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
  const map = (context) => {
    // log.debug('context', JSON.stringify(context));

    const quoteLineObj = JSON.parse(context.value);

    context.write({
      key: quoteLineObj.quote,
      value: quoteLineObj
    });
  };

  /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
  const reduce = (context) => {
    // log.debug('context', JSON.stringify(context));

    const quoteId = context.key;

    const quote = record.load({
      type: 'estimate',
      id: quoteId,
      isDynamic: true
    });

    quote.setValue('entitystatus', 19); // Won

    for (let a = 0; a < context.values.length; a++) {
      // log.debug('context.values[a]', context.values[a]);

      const quoteLineObj = JSON.parse(context.values[a]);

      const quoteLine = quote.findSublistLineWithValue({
        sublistId: 'item',
        fieldId: 'line',
        value: quoteLineObj.line
      });

      quote.selectLine('item', quoteLine);
      quote.setCurrentSublistValue('item', 'custcol_linked_salesorder', quoteLineObj.salesOrderId);
      quote.setCurrentSublistValue('item', 'custcol_hci_line_id', quoteLineObj.selectionNum);
      quote.commitLine('item');
    }

    quote.save({
      enableSourcing: true,
      ignoreMandatoryFields: true
    });

    log.debug('Quote Updated, ID=' + quoteId);
  };

  /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
  // eslint-disable-next-line no-unused-vars
  const summarize = (summary) => {
    log.debug('Process Complete');
  };

  return {
    getInputData,
    map,
    reduce,
    summarize
  };
});
