/**
 * This is a basic suitelet that should load the Query in a list format, then the suitelet should load the query using onGet. Currently this does not do anything onPost
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
  "N/file",
  "N/format",
  "N/https",
  "N/query",
  "N/record",
  "N/runtime",
  "N/search",
  "N/task",
  "N/ui/message",
  "N/ui/serverWidget",
  "N/url",
]
/**
 * @param{file} file
 * @param{format} format
 * @param{https} https
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 * @param{message} message
 * @param{serverWidget} serverWidget
 * @param{url} url
 */, (
  file,
  format,
  https,
  query,
  record,
  runtime,
  search,
  task,
  message,
  serverWidget,
  url
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    // Perform the search for the items

    log.audit({title: `${context.request.method} request received`});

    const eventRouter = {
      [https.Method.GET]: onGet,
      [https.Method.POST]: onPost
    };

    try {
      (eventRouter[context.request.method])(context);
    } catch (e) {
      onError({context: context, error: e});
    }


    log.audit({title: "Request complete."});
  }


  function onGet(context) {
    // TODO
    // onGet is used for posting existing data - this is not for the post information - parameters in the get has to come from the URL
    // onPost has to come from the URL - what are the tools to parse the post?

    // pass the paramters from the context parameters
    let parameters = context.request.parameters;
    log.debug({title: `ln 79 parameters`, details: `${JSON.stringify(parameters)}`});
    // defines item here with no parameter
    // if parameters.item does not equal undefined then take the parameter and redefine the item as the parameter item, else move on and create the form
    // let item;
    let entityId;
    // how do I define the parameters? Is this done in the client script?
    if(typeof(parameters.entityId) != 'undefined') {
      item = parameters.entityId;
    }
    const scriptObj = runtime.getCurrentScript();

    /**
     * Form is defined here
     * 
     */
    let form = serverWidget.createForm({
      title: "Historical Sales Orders"
    });

    /**
     * What does this path do? - Ask Rick
     * Client script - select the client script here - this is what runs the functions for the UI interface
     * 
     */
    try {
      // this is a client script - has to be created - this is a current failpoint.
      form.clientScriptModulePath = '/SuiteScripts/Custom Reports/nco_cl_inv_item_detail.js';
    } catch(e) {
      log.error({title: `ln 93`, details: `name: ${e.name}, message: ${e.message}`});
    }

    //todo: add Sales Orders stuff to form - define and create the form

    let fldTranId = form.addField({id: 'custpage_sl_histsales_tranid',label: 'Trans Id',type: serverWidget.FieldType.TEXT});
    let fldDate = form.addField({id: 'custpage_sl_histsales_date',label: 'Date',type: serverWidget.FieldType.TEXT});
    let fldRate = form.addField({id: 'custpage_sl_histsales_rate',label: 'Rate',type: serverWidget.FieldType.TEXT});
    let fldQuantity = form.addField({id: 'custpage_sl_histsales_quantity',label: 'Quantity',type: serverWidget.FieldType.TEXT});
    let fldItemName = form.addField({id: 'custpage_sl_histsales_item_name',label: 'Item Name',type: serverWidget.FieldType.TEXT});

    // make these inlinhe

    fldTranId.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
    fldDate.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
    fldRate.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
    fldQuantity.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
    fldItemName.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

    // Help Fields
    // fldTranId.setHelpText({help : `The Vendor Group or Vendor Code.`});
    // fldDate.setHelpText({help : `This is the unique Id for the item displayed.`});
    // fldRate.setHelpText({help : `This is the item Name and Link to NetSuite item record.`});
    // fldQuantity.setHelpText({help : `For Future use opf Turnover Ratio for the Trailing 12 months.`});
    // fldItemName.setHelpText({help : `Average Cost of the item from the NetSuite Item Record.`});


  //   let resultList = form.addSublist(
  //     {
  //       id: 'custpage_sl_one',  // Sublist 1 of #
  //       label: `Item Usage`,
  //       type: serverWidget.SublistType.LIST //
  //     }
  //   );

  //   // Add field for sublist
  //   resultList.addField({id: 'custpage_sl_item_use',label: 'Item Use',type: serverWidget.FieldType.TEXT});
  //  // resultList.addField({id: 'custpage_sl_vend_code',label: 'Vendor Code',type: serverWidget.FieldType.TEXT});
  //  // resultList.addField({id: 'custpage_sl_item_name',label: 'Item',type: serverWidget.FieldType.TEXT});
  //   resultList.addField({id: 'custpage_sl_tran_count',label: 'Tran Count',type: serverWidget.FieldType.INTEGER});
  //   resultList.addField({id: 'custpage_sl_quantity',label: 'Quantity',type: serverWidget.FieldType.INTEGER});
  //   resultList.addField({id: 'custpage_sl_amt_total',label: 'Total COGS',type: serverWidget.FieldType.CURRENCY});


   
    const historicalSales = (entityId, form) => {
      try{
      log.debug("Inside Historical Sales", entityId);
      let sql = `SELECT TRANSACTION.TranID AS tranid,
      TRANSACTION.TranDate AS date,
      TransactionLine.rate,
      TransactionLine.quantity AS quantity,
      BUILTIN.DF(TransactionLine.item) AS item_name,
  FROM TRANSACTION
  INNER JOIN transactionLine ON TRANSACTION.id = transactionLine.TRANSACTION
  WHERE TRANSACTION.Entity = ${entityId}
  
  UNION ALL
  
  SELECT custrecord_nco_so_hist_invnum AS tranid,
      custrecord_nco_so_hist_date AS date,
      custrecord_nco_so_hist_item_price AS rate,
      custrecord_nco_so_hist_qty AS quantity,
      custrecord_nco_so_hist_item AS item_name
  FROM customrecord_nco_so_hist_lines
  WHERE custrecord_nco_so_hist_lines_cust = ${entityId}
    `;

      let results = query.runSuiteQL({ query: sql }).asMappedResults();
      if (results.length > 0) {
        let listSales = form.addSublist({
          id: 'custpage_sl_sales',
          label: `Item Sales (${results.length})`,
          type: serverWidget.SublistType.LIST
        });

      listSales.addField({
        id: 'custpage_sl_histsales_tranid',
        label: 'Trans Id',
        type: serverWidget.FieldType.TEXT
      });
      listSales.addField({
        id:'custpage_sl_histsales_date',
        label: 'Date',
        type: serverWidget.FieldType.TEXT
      });
      listSales.addfield({
        id: 'custpage_sl_histsales_rate',
        label: 'Rate',
        type: serverWidget.FieldType.TEXT
      });
      listSales.addfield({
        id: 'custpage_sl_histsales_quantity',
        label: 'Quantity',
        type: serverWidget.FieldType.TEXT
      })
      listSales.addfield({
        id: 'custpage_sl_histsales_item_name',
        label: 'Item Name',
        type: serverWidget.FieldType.TEXT
      })

      let columnNames = Object.keys(results[0]);
      for (let i = o; i<results.length; i++) {
        
        let result = results[i];
        for (let c = 0; c < columnNames.length; c++) {
        let columnName = columnNames[c];
        let value = result[columnName];
        switch (columnName) {
          case 'tranid':
                  listSales.setSublistValue({
                    id: 'custpage_histsales_tranid',
                    line: i,
                    value: value
                  });
                  break;
          case 'date':
            listSales.setSublistValue({
              id: 'custpage_sl_histsales_date',
              line: i,
              value: value
            });
              break;
          case 'rate':
            listSales.setSublistValue({
              id: 'custpage_sl_histsales_rate',
              line: i,
              value: value
            });
            break;
          case 'quantity':
          listSales.setSublistValue({
            id: 'custpage_sl_histsales_quantity',
            line: i,
            value: value
          });
            break;
          case 'item_name':
            listSales.setSublistValue({
              id: 'custpage_sl_histsales_item_name',
              line: i,
              value: value
            });
            break;
          default:
          }
        }

      }

    }
    return true;
  }
    catch(e) {
      log.debug({title: `historical sales`, details: `name: ${e.name}, message: ${e.message}`});
      return false;
    }
  }


  if(typeof(paramters.entityId) != 'undefined') {
    historicalSales(entityId, form);
  }

  context.response.writePage(form);
  log.debug({title: 'End onGet'})
  }

  return { onRequest };
});