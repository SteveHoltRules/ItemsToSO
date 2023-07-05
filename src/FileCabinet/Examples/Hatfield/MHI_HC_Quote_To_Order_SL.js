/* eslint-disable no-loop-func */
/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAmdConfig ./underscoreConfig.json
 */
define(['underscore', 'N/format', 'N/record', 'N/ui/serverWidget', 'N/https', 'N/ui/message', 'N/runtime', 'N/search', 'N/task', 'N/url'], (_, format, record, serverWidget, https, message, runtime, search, task, url) => {
  const CLIENT_SCRIPT_FILE = 'SuiteScripts/Myers-Holum/Client-Scripts/MHI_HC_Quote_To_Order_CS.js';
  const SEARCH_ID = 'customsearch_quote_lines_to_consolidate'; // Quote Lines to Consolidate - DND
  const SCHEDULED_SCRIPT_EXT = '_mhi_hc_quote_to_order_mr';
  /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
  const onRequest = (context) => {
    const {
      custpage_customer, custpage_branch, custpage_sales_order, custpage_po_number,
      custpage_quote_number, custpage_from_date, custpage_to_date, custpage_creator
    } = context.request.parameters;
    const scriptId = runtime.getCurrentScript().id;
    const { deploymentId } = runtime.getCurrentScript();
    const thisURL = url.resolveScript({
      deploymentId,
      scriptId
    });

    if (context.request.method === 'GET') {
      const form = serverWidget.createForm({
        title: 'Transform Quotes to Sales Order'
      });

      const filters = [];

      filters.push(search.createFilter({
        name: 'scriptid',
        join: 'scriptdeployment',
        operator: search.Operator.IS,
        values: 'customdeploy' + SCHEDULED_SCRIPT_EXT
      }));

      filters.push(search.createFilter({
        name: 'status',
        operator: search.Operator.ANYOF,
        values: ['RUNNING', 'PENDING']
      }));

      const deploymentSearch = search.create({
        type: 'scheduledscriptinstance',
        filters,
        columns: ['status']
      });

      let scriptRunning = false;

      // eslint-disable-next-line no-unused-vars
      deploymentSearch.run().each((result) => {
        scriptRunning = true;

        return false;
      });

      if (scriptRunning) {
        form.addButton({
          id: 'custpage_search',
          label: 'Refresh',
          functionName: 'location.reload();'
        });

        form.addField({
          id: 'custpage_message',
          type: serverWidget.FieldType.TEXT,
          label: 'Message'
        }).updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE
        }).defaultValue = 'Sales Order creation process running.';

        context.response.writePage(form);

        return;
      }

      form.clientScriptModulePath = CLIENT_SCRIPT_FILE;

      const lastSalesOrderId = runtime.getCurrentScript().getParameter({
        name: 'custscript_mhi_last_sales_order'
      });

      if (lastSalesOrderId) {
        const lastSalesOrderURL = url.resolveRecord({
          recordId: lastSalesOrderId,
          recordType: 'salesorder'
        });

        const lastSalesOrderFields = search.lookupFields({
          type: 'salesorder',
          id: lastSalesOrderId,
          columns: 'tranid'
        });

        form.addPageInitMessage({
          type: message.Type.INFORMATION,
          title: 'Last Sales Order Processed: <a href="' + lastSalesOrderURL + '" target="_blank">' + lastSalesOrderFields.tranid + '</a>'
        });
      }

      form.addSubmitButton({
        label: 'Create Sales Order'
      });

      form.addButton({
        id: 'custpage_search',
        label: 'Search',
        functionName: 'runSearch("' + thisURL + '");'
      });

      const customerField = form.addField({
        id: 'custpage_customer',
        label: 'Customer',
        type: 'select',
        source: 'customer'
      });

      if (custpage_customer) customerField.defaultValue = custpage_customer;

      const branchField = form.addField({
        id: 'custpage_branch',
        label: 'Branch',
        type: 'select',
        source: 'customrecord_cseg_hci_branch'
      });

      if (custpage_branch) branchField.defaultValue = custpage_branch;

      const quoteNumberField = form.addField({
        id: 'custpage_quote_number',
        label: 'Quote Number',
        type: 'text'
      });

      if (custpage_quote_number) quoteNumberField.defaultValue = custpage_quote_number;

      const fromDateField = form.addField({
        id: 'custpage_from_date',
        label: 'From Date',
        type: 'date'
      });

      if (custpage_from_date) fromDateField.defaultValue = custpage_from_date;

      const toDateField = form.addField({
        id: 'custpage_to_date',
        label: 'To Date',
        type: 'date'
      });

      if (custpage_to_date) toDateField.defaultValue = custpage_to_date;

      const creatorField = form.addField({
        id: 'custpage_creator',
        label: 'Order Entry Creator',
        type: 'select',
        source: 'employee'
      });

      if (custpage_creator) creatorField.defaultValue = custpage_creator;

      if (!custpage_quote_number && (!custpage_customer || !custpage_branch)) {
        context.response.writePage(form);
        return;
      }

      const salesOrderField = form.addField({
        id: 'custpage_sales_order',
        label: 'Add to Sales Order',
        type: 'select'
      });

      salesOrderField.updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTCOL
      });

      salesOrderField.addSelectOption({
        value: '',
        text: '',
        selected: true
      });

      if (custpage_customer && custpage_branch) {
        const soFilters = [];

        soFilters.push(search.createFilter({
          name: 'mainline',
          operator: search.Operator.IS,
          values: true
        }));

        soFilters.push(search.createFilter({
          name: 'entity',
          operator: search.Operator.IS,
          values: custpage_customer
        }));

        soFilters.push(search.createFilter({
          name: 'cseg_hci_branch',
          operator: search.Operator.IS,
          values: custpage_branch
        }));

        soFilters.push(search.createFilter({
          name: 'status',
          operator: search.Operator.NONEOF,
          values: ['SalesOrd:C', 'SalesOrd:H']
        }));

        const salesOrderSearch = search.create({
          type: 'salesorder',
          filters: soFilters,
          columns: 'tranid'
        });

        salesOrderSearch.run().each((result) => {
          salesOrderField.addSelectOption({
            value: result.id,
            text: result.getValue('tranid')
          });
          return true;
        });
      }

      const poNumberField = form.addField({
        id: 'custpage_po_number',
        label: 'PO #',
        type: 'text'
      });

      poNumberField.isMandatory = true;

      const quoteList = form.addSublist({
        id: 'custpage_quote_list',
        label: 'Quote Lines',
        type: serverWidget.SublistType.LIST
      });

      quoteList.addField({
        id: 'custpage_select',
        label: 'Select',
        type: 'checkbox'
      });

      const quoteField = quoteList.addField({
        id: 'custpage_quote',
        label: 'Quote',
        type: 'select',
        source: 'estimate'
      });

      quoteField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      });

      quoteList.addField({
        id: 'custpage_date',
        label: 'Date',
        type: 'date'
      });

      const createdByField = quoteList.addField({
        id: 'custpage_creator',
        label: 'Order Entry Creator',
        type: 'select',
        source: 'employee'
      });

      createdByField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      });

      const lineField = quoteList.addField({
        id: 'custpage_line',
        label: 'Line ID',
        type: 'integer'
      });

      lineField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN
      });

      const itemField = quoteList.addField({
        id: 'custpage_item',
        label: 'Item',
        type: 'select',
        source: 'item'
      });

      itemField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      });

      quoteList.addField({
        id: 'custpage_memo',
        label: 'Line Item Description',
        type: 'textarea'
      });

      quoteList.addField({
        id: 'custpage_quantity',
        label: 'Quantity',
        type: 'integer'
      });

      quoteList.addField({
        id: 'custpage_rate',
        label: 'Rate',
        type: 'currency'
      });

      quoteList.addField({
        id: 'custpage_amount',
        label: 'Amount',
        type: 'currency'
      });

      const selectionNumField = quoteList.addField({
        id: 'custpage_selection_num',
        label: 'Selection Number',
        type: 'integer'
      });

      selectionNumField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.ENTRY
      });

      selectionNumField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED
      });

      const quoteSearch = search.load({
        id: SEARCH_ID
      });

      if (custpage_customer) {
        quoteSearch.filters.push(search.createFilter({
          name: 'entity',
          operator: search.Operator.IS,
          values: custpage_customer
        }));
      }

      if (custpage_branch) {
        quoteSearch.filters.push(search.createFilter({
          name: 'cseg_hci_branch',
          operator: search.Operator.IS,
          values: custpage_branch
        }));
      }

      if (custpage_quote_number) {
        quoteSearch.filters.push(search.createFilter({
          name: 'tranid',
          operator: search.Operator.IS,
          values: custpage_quote_number
        }));
      }

      if (custpage_from_date) {
        quoteSearch.filters.push(search.createFilter({
          name: 'trandate',
          operator: search.Operator.ONORAFTER,
          values: custpage_from_date
        }));
      }

      if (custpage_to_date) {
        quoteSearch.filters.push(search.createFilter({
          name: 'trandate',
          operator: search.Operator.ONORBEFORE,
          values: custpage_to_date
        }));
      }

      if (custpage_creator) {
        quoteSearch.filters.push(search.createFilter({
          name: 'createdby',
          operator: search.Operator.IS,
          values: custpage_creator
        }));
      }

      const pagedRun = quoteSearch.runPaged({
        pageSize: 1000
      });

      const pageCount = pagedRun.pageRanges.length;
      const results = [];

      for (let i = 0; i < pageCount; i++) {
        const searchPage = pagedRun.fetch({
          index: i
        });

        searchPage.data.forEach((result) => {
          // log.debug('result', JSON.stringify(result));

          results.push(result);
        });
      }

      for (let x = 0; x < results.length; x++) {
        const result = results[x];

        quoteList.setSublistValue({
          id: 'custpage_quote',
          line: x,
          value: result.id
        });

        quoteList.setSublistValue({
          id: 'custpage_date',
          line: x,
          value: result.getValue('trandate')
        });

        quoteList.setSublistValue({
          id: 'custpage_creator',
          line: x,
          value: result.getValue('createdby')
        });

        quoteList.setSublistValue({
          id: 'custpage_line',
          line: x,
          value: result.getValue('line')
        });

        quoteList.setSublistValue({
          id: 'custpage_item',
          line: x,
          value: result.getValue('item')
        });

        if (result.getValue('memo')) {
          quoteList.setSublistValue({
            id: 'custpage_memo',
            line: x,
            value: result.getValue('memo')
          });
        }

        quoteList.setSublistValue({
          id: 'custpage_quantity',
          line: x,
          value: result.getValue('quantity')
        });

        quoteList.setSublistValue({
          id: 'custpage_rate',
          line: x,
          value: result.getValue('rate')
        });

        quoteList.setSublistValue({
          id: 'custpage_amount',
          line: x,
          value: result.getValue('amount')
        });
      }

      context.response.writePage(form);
    } else {
      const lineCount = context.request.getLineCount('custpage_quote_list');
      const unorderedLines = [];

      for (let j = 0; j < lineCount; j++) {
        const selected = context.request.getSublistValue('custpage_quote_list', 'custpage_select', j);
        const quote = context.request.getSublistValue('custpage_quote_list', 'custpage_quote', j);
        const line = context.request.getSublistValue('custpage_quote_list', 'custpage_line', j);
        const selectionNum = context.request.getSublistValue('custpage_quote_list', 'custpage_selection_num', j);

        if (selected != 'T') continue;

        const lineObj = {
          quote,
          line,
          selectionNum
        };

        unorderedLines.push(lineObj);
      }

      const sortedLines = _.sortBy(unorderedLines, 'selectionNum');
      const quotes = _.uniq(_.pluck(sortedLines, 'quote'));

      const fieldMap = {
        location: 'location',
        line: 'custcol_hci_line_id',
        item: 'item',
        custcol_mhi_hc_specialorder: 'custcol_mhi_hc_specialorder',
        custcol_mhi_hc_dropship: 'custcol_mhi_hc_dropship',
        memo: 'description',
        quantity: 'quantity',
        pricelevel: 'price',
        rate: 'rate',
        amount: 'amount',
        shipdate: 'expectedshipdate',
        custcol_hci_gp_vendor: 'povendor,custcol_hci_gp_vendor',
        custcol_hci_alternatevendor: 'custcol_hci_alternatevendor',
        custcol_hci_soporate: 'porate,custcol_hci_soporate',
        custcol_hf_item_type: 'custcol_hf_item_type',
        custcol_scm_customerpartnumber: 'custcol_scm_customerpartnumber',
        costestimate: 'costestimate'
      };

      const filters = [];

      filters.push(search.createFilter({
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: quotes
      }));

      filters.push(search.createFilter({
        name: 'mainline',
        operator: search.Operator.IS,
        values: false
      }));

      const searchFields = _.keys(fieldMap);

      const quoteSearch = search.create({
        type: 'estimate',
        filters,
        columns: _.clone(searchFields)
      });

      quoteSearch.columns.push(
        search.createColumn({
          name: 'costestimatetype',
          join: 'item'
        })
      );

      const pagedRun = quoteSearch.runPaged({
        pageSize: 1000
      });

      const pageCount = pagedRun.pageRanges.length;
      const quoteLines = [];

      for (let i = 0; i < pageCount; i++) {
        const searchPage = pagedRun.fetch({
          index: i
        });

        searchPage.data.forEach((result) => {
          // log.debug('result', JSON.stringify(result));
          const quoteLineObj = { id: result.id };

          for (let x = 0; x < searchFields.length; x++) {
            quoteLineObj[searchFields[x]] = result.getValue(searchFields[x]);
          }

          quoteLines.push(quoteLineObj);
        });
      }

      // log.debug('Quote Lines', JSON.stringify(quoteLines));

      let salesOrder = null;
      let soLineCount = 0;

      if (custpage_sales_order) {
        salesOrder = record.load({
          type: 'salesorder',
          id: custpage_sales_order,
          isDynamic: true
        });

        soLineCount = salesOrder.getLineCount('item');
      } else {
        let customerId = custpage_customer;

        if (!customerId) {
          const quoteFields = search.lookupFields({
            type: 'estimate',
            id: sortedLines[0].quote,
            columns: 'entity'
          });

          customerId = quoteFields.entity[0].value;
        }

        salesOrder = record.transform({
          fromType: 'customer',
          fromId: customerId,
          toType: 'salesorder',
          isDynamic: true
        });

        salesOrder.setValue('orderstatus', 'A');
        salesOrder.setValue('otherrefnum', custpage_po_number);
        salesOrder.setValue('cseg_hci_branch', custpage_branch);
      }

      for (let a = 0; a < sortedLines.length; a++) {
        const orderLineObj = sortedLines[a];

        // log.debug('orderLineObj', JSON.stringify(orderLineObj));

        const { quote, line } = orderLineObj;

        const quoteLineObj = _.findWhere(quoteLines, { id: quote, line });

        log.debug('quoteLineObj', JSON.stringify(quoteLineObj));

        if (quoteLineObj) {
          let isVendorItem = false;
          soLineCount += 1;
          orderLineObj.selectionNum = soLineCount;

          salesOrder.selectNewLine('item');
          salesOrder.setCurrentSublistValue('item', 'custcol_hci_linnkedquote', quoteLineObj.id);

          _.each(searchFields, (searchField) => {
            let value = quoteLineObj[searchField];
            const setColumns = fieldMap[searchField].split(',');

            // log.debug('searchField=' + searchField);

            if (value && searchField == 'shipdate') {
              value = format.parse({
                value,
                type: format.Type.DATE
              });
            } else if (value && (searchField == 'custcol_mhi_hc_specialorder' || searchField == 'custcol_mhi_hc_dropship')) {
              isVendorItem = true;
              return;
            }

            for (let c = 0; c < setColumns.length; c++) {
              const setColumn = setColumns[c];

              if (!isVendorItem && (setColumn == 'povendor' || setColumn == 'custcol_hci_gp_vendor' || setColumn == 'porate' || setColumn == 'custcol_hci_soporate')) {
                return;
              }

              if (value && setColumn == 'povendor') {
                value = parseInt(value);
              } else if (value && setColumn == 'custcol_hci_line_id') {
                value = soLineCount;
              }

              // log.debug(setColumn, value);

              salesOrder.setCurrentSublistValue('item', setColumn, value);
            }
          });

          salesOrder.commitLine('item');
        }
      }

      if (!custpage_sales_order && quotes.length == 1) {
        const quote = record.load({
          type: 'estimate',
          id: sortedLines[0].quote,
          isDynamic: true
        });

        salesOrder.setValue('cseg_hci_branch', quote.getValue('cseg_hci_branch'));
        salesOrder.setValue('custbody_hf_fob', quote.getValue('custbody_hf_fob'));
        salesOrder.setValue('custbody_hci_freightterms', quote.getValue('custbody_hci_freightterms'));
        salesOrder.setValue('shipcarrier', quote.getValue('shipcarrier'));
        salesOrder.setValue('shipmethod', quote.getValue('shipmethod'));
        salesOrder.setValue('custbody_hf_freight_carrier', quote.getValue('custbody_hf_freight_carrier'));
        salesOrder.setValue('custbody_hci_ordercreator', quote.getValue('custbody_hci_ordercreator'));
        salesOrder.setValue('custbody_if_bol_notes', quote.getValue('custbody_if_bol_notes'));
        salesOrder.setValue('custbody_hf_third_party_account', quote.getValue('custbody_hf_third_party_account'));

        const salesOrderLineCount = salesOrder.getLineCount('salesteam');

        for (let s = salesOrderLineCount - 1; s >= 0; s--) {
          salesOrder.removeLine({
            sublistId: 'salesteam',
            line: s
          });
        }

        const salesTeamLineCount = quote.getLineCount('salesteam');

        for (let s = 0; s < salesTeamLineCount; s++) {
          salesOrder.selectNewLine('salesteam');
          salesOrder.setCurrentSublistValue('salesteam', 'employee', quote.getSublistValue('salesteam', 'employee', s));
          salesOrder.setCurrentSublistValue('salesteam', 'salesrole', quote.getSublistValue('salesteam', 'salesrole', s));
          salesOrder.setCurrentSublistValue('salesteam', 'isprimary', quote.getSublistValue('salesteam', 'isprimary', s));
          salesOrder.setCurrentSublistValue('salesteam', 'contribution', quote.getSublistValue('salesteam', 'contribution', s));
          salesOrder.commitLine('salesteam');
        }
      }

      const salesOrderId = salesOrder.save();

      log.debug('Sales Order Created, ID=' + salesOrderId);

      let scriptDeploymentId = null;

      const deploymentSearch = search.create({
        type: 'scriptdeployment',
        filters: search.createFilter({
          name: 'scriptid',
          operator: search.Operator.IS,
          values: 'customdeploy_mhi_hc_quote_to_order_sl'
        })
      });

      deploymentSearch.run().each((result) => {
        scriptDeploymentId = result.id;

        return false;
      });

      record.submitFields({
        type: 'scriptdeployment',
        id: scriptDeploymentId,
        values: { custscript_mhi_last_sales_order: salesOrderId }
      });

      const orderObj = {
        salesOrderId,
        lines: sortedLines
      };

      task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: 'customscript' + SCHEDULED_SCRIPT_EXT,
        deploymentId: 'customdeploy' + SCHEDULED_SCRIPT_EXT,
        params: { custscript_mhi_order: JSON.stringify(orderObj) }
      }).submit();

      context.response.sendRedirect({
        identifier: record.Type.SALES_ORDER,
        type: https.RedirectType.RECORD,
        editMode: false,
        id: salesOrderId
      });
    }
  };

  return {
    onRequest
  };
});
