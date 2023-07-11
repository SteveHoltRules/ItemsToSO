/* eslint-disable block-scoped-var */
/* eslint-disable no-redeclare */
/* eslint-disable no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-alert */
/**
 * @NApiVersion 2.X
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/format', 'N/search', 'N/ui/dialog'], function (currentRecord, format, search, dialog) {
  var exports = {};
  var selectionCount = 0;

  var duplicatePO = false;

  /**
     * Function to be executed after page is initialized.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.mode
     *        {String} The mode in which the record is being accessed (create,
     *        copy, or edit)
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function pageInit
     */
  function pageInit(scriptContext) {

  }

  /**
     * Function to be executed when field is changed. It runs on the suitelet pages that are selected.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     * @param scriptContext.fieldId
     *        {String} Field name
     * @param [scriptContext.lineNum]
     *        {Number} Line number. Will be undefined if not a sublist or matrix
     *        field
     * @param [scriptContext.columnNum]
     *        {Number} Matrix column number. Will be undefined if not a matrix
     *        field
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function fieldChanged
     */
  function fieldChanged(scriptContext) {
    if (scriptContext.sublistId == 'custpage_quote_list' && scriptContext.fieldId == 'custpage_select') {
      var rec = scriptContext.currentRecord;

      var selected = rec.getCurrentSublistValue('custpage_quote_list', 'custpage_select');

      if (selected) {
        rec.setCurrentSublistValue('custpage_quote_list', 'custpage_selection_num', ++selectionCount);
      } else {
        rec.setCurrentSublistValue('custpage_quote_list', 'custpage_selection_num', '');
      }
    } else if (scriptContext.fieldId == 'custpage_sales_order') {
      var rec = scriptContext.currentRecord;
      var salesOrderId = rec.getValue('custpage_sales_order');

      if (salesOrderId) {
        var soFields = search.lookupFields({
          type: 'salesorder',
          id: salesOrderId,
          columns: ['otherrefnum']
        });

        var poNumber = soFields.otherrefnum;

        rec.setValue({
          fieldId: 'custpage_po_number',
          value: poNumber,
          ignoreFieldChange: true
        });

        var poNumberField = rec.getField({ fieldId: 'custpage_po_number' });
        poNumberField.isDisabled = true;
      } else {
        rec.setValue({
          fieldId: 'custpage_po_number',
          value: '',
          ignoreFieldChange: true
        });

        var poNumberField = rec.getField({ fieldId: 'custpage_po_number' });
        poNumberField.isDisabled = false;
      }
    } else if (scriptContext.fieldId == 'custpage_customer') {
      var rec = scriptContext.currentRecord;
      var customerId = rec.getValue('custpage_customer');

      if (!customerId) return;

      var customerFields = search.lookupFields({
        type: 'customer',
        id: customerId,
        columns: 'cseg_hci_branch'
      });

      if (customerFields.cseg_hci_branch && customerFields.cseg_hci_branch[0]) {
        rec.setValue('custpage_branch', customerFields.cseg_hci_branch[0].value);
      }
    } else if (scriptContext.fieldId == 'custpage_po_number') {
      var rec = scriptContext.currentRecord;
      var customerId = rec.getValue('custpage_customer');
      var poNum = rec.getValue('custpage_po_number');

      if (customerId && poNum) {
        checkDuplicatePO(customerId, poNum);
      }
    }
  }

  /**
     * Function to be executed when field is slaved.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     * @param scriptContext.fieldId
     *        {String} Field name
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function postSourcing
     */
  function postSourcing(scriptContext) {

  }

  /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function sublistChanged
     */
  function sublistChanged(scriptContext) {

  }

  /**
     * Function to be executed after line is selected.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     *
     * @return {void}
     *
     * @since 2015.2
     *
     * @static
     * @function lineInit
     */
  function lineInit(scriptContext) {

  }

  /**
     * Validation function to be executed when field is changed.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     * @param scriptContext.fieldId
     *        {String} Field name
     * @param [scriptContext.lineNum]
     *        {Number} Line number. Will be undefined if not a sublist or matrix
     *        field
     * @param [scriptContext.columnNum]
     *        {Number} Matrix column number. Will be undefined if not a matrix
     *        field
     *
     * @return {Boolean} <code>true</code> if field value is valid;
     *         <code>false</code> otherwise
     *
     * @since 2015.2
     *
     * @static
     * @function validateField
     */
  function validateField(scriptContext) {

  }

  /**
     * Validation function to be executed when sublist line is committed.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     *
     * @return {Boolean} <code>true</code> if sublist line is valid;
     *         <code>false</code> otherwise
     *
     * @since 2015.2
     *
     * @static
     * @function validateLine
     */
  function validateLine(scriptContext) {

  }

  /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     *
     * @return {Boolean} <code>true</code> to allow line insertion;
     *         <code>false</code> to prevent it
     *
     * @since 2015.2
     *
     * @static
     * @function validateInsert
     */
  function validateInsert(scriptContext) {

  }

  /**
     * Validation function to be executed when record is deleted.
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     * @param scriptContext.sublistId
     *        {String} Sublist name
     *
     * @return {Boolean} <code>true</code> to allow line deletion;
     *         <code>false</code> to prevent it
     *
     * @since 2015.2
     *
     * @static
     * @function validateDelete
     */
  function validateDelete(scriptContext) {

  }

  /**
     * SaveREcord takes in the current selections and runs validations
     *
     * @governance XXX
     *
     * @param scriptContext
     *        {Object}
     * @param scriptContext.currentRecord
     *        {Record} Current form record
     *
     * @return {Boolean} <code>true</code> to allow record to be saved;
     *         <code>false</code> to prevent it
     *
     * @since 2015.2
     *
     * @static
     * @function saveRecord
     */
  function saveRecord(scriptContext) {
  
    var rec = scriptContext.currentRecord;

    if (duplicatePO) {
      return confirm('PO# already assigned to an existing Sales Order for this Customer. Continue?');
    }

    var lineCount = rec.getLineCount('custpage_quote_list');
    var linesSelected = false;

    for (var j = 0; j < lineCount; j++) {
      var selected = rec.getSublistValue('custpage_quote_list', 'custpage_select', j);

      if (selected) {
        linesSelected = true;
        break;
      }
    }

    if (!linesSelected) {
      dialog.alert({
        title: 'Error',
        message: 'You must select at least one quote line to create sales order.'
      });

      return false;
    }

    return confirm('Selected quote lines will be submitted for sales order creation, proceed?');
  }

  function runSearch(url) {
    var rec = currentRecord.get();
    var customer = rec.getValue('custpage_customer');
    var branch = rec.getValue('custpage_branch');
    var quoteNumber = rec.getValue('custpage_quote_number');
    var fromDate = rec.getValue('custpage_from_date');
    var toDate = rec.getValue('custpage_to_date');
    var creator = rec.getValue('custpage_creator');

    if (!quoteNumber && (!customer || !branch)) {
      dialog.alert({
        title: 'Error',
        message: 'Please enter a Customer and Branch or a Quote Number.'
      });
    } else {
      var newUrl = url;

      if (customer) newUrl += '&custpage_customer=' + customer;
      if (branch) newUrl += '&custpage_branch=' + branch;
      if (quoteNumber) newUrl += '&custpage_quote_number=' + quoteNumber;
      if (creator) newUrl += '&custpage_creator=' + creator;

      if (fromDate) {
        var dateStr = format.format({ value: fromDate, type: format.Type.DATE });
        newUrl += '&custpage_from_date=' + dateStr;
      }

      if (toDate) {
        var dateStr = format.format({ value: toDate, type: format.Type.DATE });
        newUrl += '&custpage_to_date=' + dateStr;
      }

      window.onbeforeunload = null;
      window.open(newUrl, '_self');
    }
  }

  function checkDuplicatePO(customerId, poNum) {
    var filters = [];

    filters.push(search.createFilter({
      name: 'mainline',
      operator: search.Operator.IS,
      values: true
    }));

    filters.push(search.createFilter({
      name: 'entity',
      operator: 'is',
      values: customerId
    }));

    filters.push(search.createFilter({
      name: 'poastext',
      operator: 'is',
      values: poNum
    }));

    var searchObj = search.create({
      type: 'salesorder',
      filters: filters,
    });

    var poFound = false;

    searchObj.run().each(function (result) {
      poFound = true;
      return false;
    });

    if (poFound) {
      duplicatePO = true;
      var msgOptions = {
        title: 'Duplicate Warning',
        message: 'PO# already assigned to an existing Sales Order for this Customer'
      };
      dialog.alert(msgOptions);
    } else duplicatePO = false;
  }

  // exports.pageInit = pageInit;
  exports.fieldChanged = fieldChanged;
  // exports.postSourcing = postSourcing;
  // exports.sublistChanged = sublistChanged;
  // exports.lineInit = lineInit;
  // exports.validateField = validateField;
  // exports.validateLine = validateLine;
  // exports.validateInsert = validateInsert;
  // exports.validateDelete = validateDelete;
  exports.saveRecord = saveRecord;
  exports.runSearch = runSearch;
  return exports;
});
