define(['N/record', 'N/search', 'N/query',  'N/runtime',  'N/https'],

  (record, search, query, runtime, https) => {

    /**
     * Module Description...
     *
     * @type {Object} module-name
     *
     * @copyright 2023 Inscio, LLC
     * @author Rick Williams <rick.williams@inscio.com>
     * @client HAT - Hatfield
     *
     * @NApiVersion 2.1
     * @NModuleScope  SameAccount
     *
     * @NScriptType ClientScript
     */
    var exports = {};

    /**
     * pageInit event handler; executed when the page completes loading or when the form is reset.
     *
     * @gov XXX
     *
     * @param {Object} context
     * @param {string} context.mode - The access mode of the current record.
     * @param {CurrentRecord} context.currentRecord - The record in context
     */
    function pageInit(context) {
      // TODO
    }


    /**
     * fieldChanged event handler; executed when a field is changed by a user or client side call.
     *
     * @gov XXX
     *
     * @param {Object} context
     * @param {CurrentRecord} context.currentRecord - The current form record
     * @param {string} context.sublistId - The internal ID of the sublist.
     * @param {string} context.fieldId - The internal ID of the field that was changed.
     * @param {string} [context.lineNum] - The index of the line if the field is in a sublist or
     *      matrix.
     * @param {string} [context.columnNum] - The index of the column if the field is in a matrix.
     */
    function fieldChanged(context) {

      /*
         Can also use for other client script end points (e.g. sublist, post sourcing)
           Youtube time mart 26:45, only works with simple field changed, not complicated conditionals
           https://stoic.software/effective-suitescript/22-event-router/


      The field being checked are examples.  Replace these routes and
      add function to manage the change to correspond with them.
      */
      // TODO
      var eventRouter = {
        "entity": handleEntityChange,
        "item": handleItemChange,
        "quantity": handleQuantityChange,
        "amount": handleAmountChange,
        "rate": handleRateChange
      };

      if (typeof eventRouter[context.fieldId] !== "function") {
        return;
      }

      eventRouter[context.fieldId](context);

    }

    function handleEntityChange(context) {
      // Do something

      // Do something else
    }

    function handleItemChange(context) {
      // Do the same something

      // Do another thing

      // Do yet another thing
    }

    function handleQuantityChange(context) {
      // Do a completely different thing

      // Do a somewhat similar thing

      // Do something wrong

      // Do more things

      // Do many more things
    }

    function handleAmountChange(context) {
      // Do a completely different thing

      // Do a somewhat similar thing

      // Do something wrong
    }

    function handleRateChange(context) {
      // Do a completely different thing

      // Do a somewhat similar thing

      // Do something wrong
    }


    exports.pageInit = pageInit;
    exports.fieldChanged = fieldChanged;
    return exports;
  });