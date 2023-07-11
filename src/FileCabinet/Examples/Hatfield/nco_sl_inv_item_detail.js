define(['N/record', 'N/search', 'N/query', 'N/ui/serverWidget', 'N/runtime', 'N/file', 'N/https', 'N/error'],

  (record, search, query, serverWidget, runtime, file, https, error) => {

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
     *     *
     * @NScriptType Suitelet
     */
    let exports = {};

    /**
     * onRequest event handler
     *
     * @gov XXX
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - The incoming request object
     * @param {ServerResponse} context.response - The outgoing response object
     */
    function onRequest(context) {
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


    /**
     * Error handler for Suitelet
     *
     * @gov XXX
     *
     * @param {Object} params
     * @param {Error} params.error - The error which triggered this handler
     * @param {Object} params.context
     * @param {ServerRequest} params.context.request - The incoming request object
     * @param {ServerResponse} params.context.response - The outgoing response object
     */
    function onError(params) {
      // TODO
    }


    /**
     * Event handler for HTTP GET request
     *
     * @gov XXX
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - The incoming request object
     * @param {ServerResponse} context.response - The outgoing response object
     */
    function onGet(context) {
      // TODO
      // Client Script ref:

      let parameters = context.request.parameters;
      log.debug({title: `ln 79 parameters`, details: `${JSON.stringify(parameters)}`});
      let item;
      if(typeof(parameters.item) != 'undefined') {
        item = parameters.item;
      }
      const scriptObj = runtime.getCurrentScript();

      let form = serverWidget.createForm({
        title: "Inventory Item Uses via Sale or Assembly Build"
      });

      try {
        form.clientScriptModulePath = '/SuiteScripts/Custom Reports/nco_cl_inv_item_detail.js';
      } catch(e) {
        log.error({title: `ln 93`, details: `name: ${e.name}, message: ${e.message}`});
      }

      //todo: add Vendor Code and

      let fldVendorCode = form.addField({id: 'custpage_sl_vendor_code',label: 'Vendor Code',type: serverWidget.FieldType.TEXT});
      let fldItemId     = form.addField({id: 'custpage_sl_item',label: 'Item Id',type: serverWidget.FieldType.TEXT});
      let fldItemName   = form.addField({id: 'custpage_sl_item_name',label: 'Item Name',type: serverWidget.FieldType.TEXT});
      let fldTurnRatio  = form.addField({id: 'custpage_sl_turn_ratio',label: 'Turn Ratio',type: serverWidget.FieldType.TEXT});
      let fldAverageCost= form.addField({id: 'custpage_sl_average_cost',label: 'Average Cost',type: serverWidget.FieldType.CURRENCY});

      // make these inlinhe

      fldVendorCode.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
      fldItemId.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
      fldItemName.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
      fldTurnRatio.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
      fldAverageCost.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});

      // Help Fields
      fldVendorCode.setHelpText({help : `The Vendor Group or Vendor Code.`});
      fldItemId.setHelpText({help : `This is the unique Id for the item displayed.`});
      fldItemName.setHelpText({help : `This is the item Name and Link to NetSuite item record.`});
      fldTurnRatio.setHelpText({help : `For Future use opf Turnover Ratio for the Trailing 12 months.`});
      fldAverageCost.setHelpText({help : `Average Cost of the item from the NetSuite Item Record.`});


    /**
     * What is this form? Is this the redirect to the sublist records?
     */

      let resultList = form.addSublist(
        {
          id: 'custpage_sl_one',  // Sublist 1 of #
          label: `Item Usage`,
          type: serverWidget.SublistType.LIST //
        }
      );

      // Add field for sublist
      resultList.addField({id: 'custpage_sl_item_use',label: 'Item Use',type: serverWidget.FieldType.TEXT});
     // resultList.addField({id: 'custpage_sl_vend_code',label: 'Vendor Code',type: serverWidget.FieldType.TEXT});
     // resultList.addField({id: 'custpage_sl_item_name',label: 'Item',type: serverWidget.FieldType.TEXT});
      resultList.addField({id: 'custpage_sl_tran_count',label: 'Tran Count',type: serverWidget.FieldType.INTEGER});
      resultList.addField({id: 'custpage_sl_quantity',label: 'Quantity',type: serverWidget.FieldType.INTEGER});
      resultList.addField({id: 'custpage_sl_amt_total',label: 'Total COGS',type: serverWidget.FieldType.CURRENCY});

      // loop through headers using

      let currentDate = new Date();
      let monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for(let m = 0; m < 12; m++) {

        let month = currentDate.getMonth();
        let year = currentDate.getFullYear();

        let colHeader = monthNames[month] + ' ' + year;
        resultList.addField({
          id: `custpage_sl_month_${m}_amt`,
          type: serverWidget.FieldType.CURRENCY,
          label: colHeader  // need to be based on the current date
        });

        currentDate.setMonth(month - 1);
      }
      // end month loop

    //   what defines this item list?

      let results = getData(item);
      log.debug({title: `ln 133 typeof(results)`, details: `${typeof(results)}`});

      if(results.length > 0) {
        let columnNames = Object.keys(results[0]);

        for (let r = 0; r < results.length; r++) {
          let result = results[r];

          if (r == 0) {
            // update body fields
            form.updateDefaultValues({
              custpage_sl_vendor_code: `${results[0].vend_code}`,
              custpage_sl_item: `${results[0].item}`,
              custpage_sl_item_name: `${results[0].item_name}`,
              custpage_sl_average_cost: `${results[0].averagecost}`
              //, custpage_sl_turn_ratio : `${results[0].vend_code}`
            });
          }
// column loop is inside the row loop - reason is to establish what is done on each column separately
        for (let c = 0; c < columnNames.length; c++) {
          let columnName = columnNames[c];
          let value = result[columnName];

          switch (columnName) {
            case 'vendor_code_id':
            case 'vendor_code':
            case 'item_name':
            case 'item':
            case 'averagecost':

              break;

            case 'item_use':
              resultList.setSublistValue(
                {id: 'custpage_sl_item_use', line: r, value: value}
              );

              break;

            case 'tran_count':
              resultList.setSublistValue(
                {id: 'custpage_sl_tran_count', line: r, value: value}
              );
              break;

            case 'quantity':

              resultList.setSublistValue(
                {id: 'custpage_sl_quantity', line: r, value: value}
              );
              break;

            case 'amt_total':
              resultList.setSublistValue(
                {id: 'custpage_sl_amt_total', line: r, value: value}
              );


              break;

            default:


          }
        }
        // this cycles through the month
          // if non zero, then list the transactions oout
        for (let m = 0; m < 12; m++) {
          let urlValue = result[`month_${m}_amt`]
          if (urlValue != 0) {
            let url = `<a target="_transactions" href="/app">${urlValue}`
        }
          resultList.setSublistValue(
            {
              id: `custpage_sl_month_${m}_amt`,
              line: r,
              value: result[`month_${m}_amt`]
            }
          );
        }

        } // end results loop

      }

    //   I don't see Rick defining item anywhere
      if(typeof(parameters.item) != 'undefined') {
        getSales(item, form);
        getBuilds(item, form);
      }


      context.response.writePage(form);
      log.debug({title: `ln 206 END onGet`});

    }

    function getData(item){
      log.debug({title: `ln 212 getData(${item})`});

      let sql = `
             WITH cte_builds
            AS (
              SELECT item.custitem_hf_vendor_code AS vendor_code_id
              ,BUILTIN.DF(item.custitem_hf_vendor_code) AS vendor_code
              ,tl.item
              ,'<a target="_inventoryItem" href="/app/common/item/item.nl?id=' || tl.item || '">' || BUILTIN.DF(tl.item) || '</a>' AS inventory_item
              ,TO_CHAR(t.tranDATE, 'YYYYMM') AS tranmonth
              ,tl.quantity
              ,tal.netamount AS tal_netamount
              ,t.cseg_hci_branch AS branchId
              ,BUILTIN.DF(t.cseg_hci_branch) AS Branch
              ,t.Type AS type
              ,BUILTIN.DF(tal.account) AS tal_acct_name
              ,tl.rate
              ,t.id AS t_id
              ,item.averagecost
            FROM TRANSACTION t
            INNER JOIN transactionLine tl ON t.id = tl.TRANSACTION
              
              INNER JOIN TransactionAccountingLine tal
                ON (
                    tl.id = tal.transactionline
                    AND tl.TRANSACTION = tal.TRANSACTION
                    )
              INNER JOIN item
                ON tl.item = item.id
            
              WHERE 1 = 1
                AND (Item.ItemType = 'InvtPart')
                AND t.type = 'Build'
                AND tal.account IN (294)
                AND tl.isinventoryaffecting = 'T'
                AND tal.posting = 'T'
              ), cte_sales AS (
            SELECT item.custitem_hf_vendor_code AS vendor_code_id
              ,BUILTIN.DF(item.custitem_hf_vendor_code) AS vendor_code
              ,tl.item
              ,'<a target="_inventoryItem" href="/app/common/item/item.nl?id=' || tl.item || '">' || BUILTIN.DF(tl.item) || '</a>' AS inventory_item
              ,TO_CHAR(t.tranDATE, 'YYYYMM') AS tranmonth
              ,tl.quantity
              ,tal.netamount AS tal_netamount
              ,t.cseg_hci_branch AS branchId
              ,BUILTIN.DF(t.cseg_hci_branch) AS Branch
              ,t.Type AS type
              ,BUILTIN.DF(tal.account) AS tal_acct_name
              ,tl.rate
              ,t.id AS t_id
              ,item.averagecost
            FROM TRANSACTION t
            INNER JOIN transactionLine tl ON t.id = tl.TRANSACTION
            
            INNER JOIN TransactionAccountingLine tal ON (
                tl.id = tal.transactionline
                AND tl.TRANSACTION = tal.TRANSACTION
                )
            INNER JOIN item ON tl.item = item.id
            /*LEFT JOIN inventoryNumber IN ON IN.item = item.id*/
            
              WHERE 1 = 1
                AND (Item.ItemType = 'InvtPart')
                AND t.type = 'ItemShip'
                AND tal.account IN (294)
                AND tal.posting = 'T'
              )
            SELECT source.item_use,
              , source.vendor_code_id
              , source.vend_code
              , source.item
              , MAX(item_name) AS item_name            
              , COUNT(source.t_id) as tran_count
              , SUM((source.quantity)) AS quantity
              , MAX(source.averagecost) as averagecost
              , SUM(source.tal_netamount) as amt_total `;

        for(let i = 0; i < 12 ; i++) {
          sql += `
           ,SUM(CASE WHEN source.tranmonth = TO_CHAR(ADD_MONTHS(SYSDATE,${-i}),'YYYYMM') then 1 else 0 end * source.tal_netamount) AS month_${i}_amt `;
        }
        sql += `            
            FROM
            (
            SELECT 'Build' AS item_use
              ,cte_builds.vendor_code_id
              ,cte_builds.vendor_code AS vend_code
              ,cte_builds.item
              ,cte_builds.inventory_item AS item_name
              ,cte_builds.tranmonth
              ,(- 1 * cte_builds.quantity) AS quantity
              ,cte_builds.tal_netamount
              ,cte_builds.branchid
              ,cte_builds.branch AS branch
              ,cte_builds.type
              ,cte_builds.tal_acct_name
              ,cte_builds.rate
              ,cte_builds.t_id
              ,cte_builds.averagecost
            FROM cte_builds
            
            UNION
            
            SELECT 'Sales' AS item_use
              ,cte_sales.vendor_code_id
              ,cte_sales.vendor_code AS vend_code
              ,cte_sales.item
              ,cte_sales.inventory_item AS item_name
              ,cte_sales.tranmonth
              ,(- 1 * cte_sales.quantity) AS quantity
              ,cte_sales.tal_netamount
              ,cte_sales.branchid
              ,cte_sales.branch AS branch
              ,cte_sales.type
              ,cte_sales.tal_acct_name
              ,cte_sales.rate
              ,cte_sales.t_id
              ,cte_sales.averagecost
            FROM cte_sales
       
            ) source 
            
            WHERE source.item = ${item}
            
            GROUP BY 
            source.item_use
            ,source .vendor_code_id
            ,source.vend_code
            ,source .item
            
            ORDER BY 1
                  
      `;
      log.debug({title: `ln 345 results`,
        detail: `sql: ${sql}`
      });

      saveSql(sql);

        let results = query.runSuiteQL({query: sql}).asMappedResults();
        log.debug({title: `ln 349 results`,
          detail: `results.length: ${results.length}`
        });

      return results;
    }


    function getSales(item, form){

      try {
        let sql = `
        SELECT DISTINCT t.TranID
          ,BUILTIN.DF(t.Entity) AS customer
          ,t.ID
          ,BUILTIN.DF(item.custitem_hf_vendor_code) AS vendor_code
          ,tl.item
          ,'<a target="_inventoryItem" href="/app/common/item/item.nl?id=' || tl.item || '">' || BUILTIN.DF(tl.item) || '</a>' AS inventory_item
          ,'<a target="_itemFufillment" href="/app/accounting/transactions/transaction.nl?id=' || t.ID || '">' || t.TranID || '</a>' AS itemfufillment
          ,BUILTIN.DF(t.STATUS) AS status
          ,'<a target="_salesOrder" href="/app/accounting/transactions/transaction.nl?id=' || tl.createdfrom || '">' || tl.createdfrom || '</a>' AS salesorder
          ,t.TranDate
          ,tl.quantity
          ,item.assetAccount
          ,BUILTIN.DF(item.assetAccount) AS asset_acct
          ,BUILTIN.DF(t.cseg_hci_branch) AS branch
          ,tl.location
          , tl.lineSequenceNumber as line_number
          , tal.netamount AS tal_netamount
        FROM TRANSACTION t
        INNER JOIN transactionline tl ON t.id = tl.TRANSACTION
        INNER JOIN transactionaccountingline tal ON (
            tl.id = tal.transactionline
            AND tl.TRANSACTION = tal.TRANSACTION
            )
        INNER JOIN item ON tl.item = item.id
        WHERE (t.Type = 'ItemShip')
          AND tl.item = ${item}
          AND (TO_CHAR(t.TranDate, 'YYYYMM') >= TO_CHAR(ADD_MONTHS(SYSDATE, - 11), 'YYYYMM'))
          AND BUILTIN.CF(t.STATUS) = 'ItemShip:C'
          AND tl.expenseaccount = 294 /*Other options are 295 Inventory Manuals*/
        ORDER BY t.Trandate ASC
          ,t.ID ASC
      `;

        let results = query.runSuiteQL({query: sql}).asMappedResults();
        if (results.length > 0) {
          // add a sublist here
          let listSales = form.addSublist({
            id: 'custpage_sl_sales',
            label: `Item Sales (${results.length})`,
            type: serverWidget.SublistType.LIST
          });

          listSales.addField({
            id: 'custpage_sale_tranid',
            label: 'Trans Id',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_customer',
            label: 'Customer',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_vendor_code',
            label: 'Vendor Code',
            type: serverWidget.FieldType.TEXT
          });
          // resultList.addField({id: 'custpage_sl_vend_code',label: 'Vendor Code',type: serverWidget.FieldType.TEXT});
          listSales.addField({
            id: 'custpage_sale_item_name',
            label: 'Item',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_item_fulfill',
            label: 'Item Fulfillment',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_status',
            label: 'Status',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_sales_order',
            label: 'Sales Order',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_tran_date',
            label: 'Tran Date',
            type: serverWidget.FieldType.TEXT
          });
          //  listSales.addField({id: 'custpage_sale_tran_quantity',label: 'Quantity',type: serverWidget.FieldType.INTEGER});
          listSales.addField({
            id: 'custpage_sale_quantity',
            label: 'Quantity',
            type: serverWidget.FieldType.INTEGER
          });
          listSales.addField({
            id: 'custpage_sale_amt_total',
            label: 'Total COGS',
            type: serverWidget.FieldType.CURRENCY
          });
          listSales.addField({
            id: 'custpage_sale_line_number',
            label: 'Line Number',
            type: serverWidget.FieldType.INTEGER
          });
          listSales.addField({
            id: 'custpage_sale_asset_acct',
            label: 'Asset Account',
            type: serverWidget.FieldType.TEXT
          });
          listSales.addField({
            id: 'custpage_sale_branch',
            label: 'Branch',
            type: serverWidget.FieldType.TEXT
          });

          let columnNames = Object.keys(results[0]);
          for (let i = 0; i < results.length; i++) {

            let result = results[i];
            for (let c = 0; c < columnNames.length; c++) {
              let columnName = columnNames[c];
              let value = result[columnName];
              switch (columnName) {

                case 'tranid':
                  listSales.setSublistValue({
                    id: 'custpage_sale_tranid',
                    line: i,
                    value: value
                  });
                  break;
                case 'customer':
                  listSales.setSublistValue({
                    id: 'custpage_sale_customer',
                    line: i,
                    value: value
                  });
                  break;
                case 'id':
                  break;
                case 'vendor_code':
                  listSales.setSublistValue({
                    id: 'custpage_sale_vendor_code',
                    line: i,
                    value: value
                  });

                  break;
                case 'item':
                  listSales.setSublistValue({
                    id: 'custpage_sale_item_name',
                    line: i,
                    value: value
                  });
                  break;
                case 'inventory_item':
                  listSales.setSublistValue({
                    id: 'custpage_sale_item_name',
                    line: i,
                    value: value
                  });
                  break;
                case 'itemfufillment':
                  listSales.setSublistValue({
                    id: 'custpage_sale_item_fulfill',
                    line: i,
                    value: value
                  });
                  break;
                case 'status':
                  listSales.setSublistValue({
                    id: 'custpage_sale_status',
                    line: i,
                    value: value
                  });
                  break;
                case 'salesorder':
                  listSales.setSublistValue({
                    id: 'custpage_sale_sales_order',
                    line: i,
                    value: value
                  });
                  break;
                case 'trandate':
                  listSales.setSublistValue({
                    id: 'custpage_sale_tran_date',
                    line: i,
                    value: value
                  });
                  break;
                case 'quantity':
                  listSales.setSublistValue({
                    id: 'custpage_sale_quantity',
                    line: i,
                    value: value
                  });
                  break;
                case 'assetaccount':
                  break;
                case 'asset_acct':
                  listSales.setSublistValue({
                    id: 'custpage_sale_asset_acct',
                    line: i,
                    value: value
                  });
                  break;
                  case 'line_number':
                  listSales.setSublistValue({
                    id: 'custpage_sale_line_number',
                    line: i,
                    value: value
                  });
                  break;
                  case 'tal_netamount':
                  listSales.setSublistValue({
                    id: 'custpage_sale_amt_total',
                    line: i,
                    value: value
                  });
                  break;
                case 'branch':
                  listSales.setSublistValue({
                    id: 'custpage_sale_branch',
                    line: i,
                    value: value
                  });
                  break;
                case 'location':
                  break;

                default:

              }
            }

          }

        }
        return true;
      }
      catch(e) {
        log.debug({title: `ln 633 sales data`, details: `name: ${e.name}, message: ${e.message}`});
        return false;
      }

    }

    function getBuilds(item, form){

      try {
        let sql = `
        SELECT DISTINCT t.TranID
          ,BUILTIN.DF(t.Entity) AS customer
          ,t.ID
          ,BUILTIN.DF(item.custitem_hf_vendor_code) AS vendor_code
          ,tl.item
          ,'<a target="_inventoryItem" href="/app/common/item/item.nl?id=' || tl.item || '">' || BUILTIN.DF(tl.item) || '</a>' AS inventory_item
          ,'<a target="_build" href="/app/accounting/transactions/transaction.nl?id=' || t.ID || '">' || t.TranID || '</a>' AS build
          ,t.STATUS
          ,'<a target="_salesOrder" href="/app/accounting/transactions/transaction.nl?id=' || tl.createdfrom || '">' || tl.createdfrom || '</a>' AS workorder
          ,t.TranDate
          ,tl.quantity
          ,item.assetAccount
          ,BUILTIN.DF(item.assetAccount) AS asset_acct
          ,BUILTIN.DF(t.cseg_hci_branch) AS branch
          ,tl.location
          , tl.lineSequenceNumber as line_number
          , tal.netamount AS tal_netamount
        FROM TRANSACTION t
        INNER JOIN transactionline tl ON t.id = tl.TRANSACTION
        INNER JOIN transactionaccountingline tal ON (
            tl.id = tal.transactionline
            AND tl.TRANSACTION = tal.TRANSACTION
            )
        INNER JOIN item ON tl.item = item.id
        WHERE (t.Type = 'Build')
          AND tl.item = ${item}
          AND (TO_CHAR(t.TranDate, 'YYYYMM') >= TO_CHAR(ADD_MONTHS(SYSDATE, - 11), 'YYYYMM'))
         
          AND tl.expenseaccount = 294 /*Other options are 295 Inventory Manuals*/
        ORDER BY t.Trandate ASC
          ,t.ID ASC
      `;

        let results = query.runSuiteQL({query: sql}).asMappedResults();
        if (results.length > 0) {
          // add a sublist here
          let listBuilds = form.addSublist({
            id: 'custpage_sl_builds',
            label: `Item Builds (${results.length})`,
            type: serverWidget.SublistType.LIST
          });

          listBuilds.addField({
            id: 'custpage_build_tranid',
            label: 'Trans Id',
            type: serverWidget.FieldType.TEXT
          });
          // listBuilds.addField({
          //   id: 'custpage_build_customer',
          //   label: 'Customer',
          //   type: serverWidget.FieldType.TEXT
          // });
          listBuilds.addField({
            id: 'custpage_build_vendor_code',
            label: 'Vendor Code',
            type: serverWidget.FieldType.TEXT
          });
          // resultList.addField({id: 'custpage_sl_vend_code',label: 'Vendor Code',type: serverWidget.FieldType.TEXT});
          listBuilds.addField({
            id: 'custpage_build_item_name',
            label: 'Item',
            type: serverWidget.FieldType.TEXT
          });
          listBuilds.addField({
            id: 'custpage_build_build',
            label: 'Build',
            type: serverWidget.FieldType.TEXT
          });
          listBuilds.addField({
            id: 'custpage_build_status',
            label: 'Status',
            type: serverWidget.FieldType.TEXT
          });
          listBuilds.addField({
            id: 'custpage_build_work_order',
            label: 'Work Order',
            type: serverWidget.FieldType.TEXT
          });
          listBuilds.addField({
            id: 'custpage_build_tran_date',
            label: 'Tran Date',
            type: serverWidget.FieldType.TEXT
          });
          //  listSales.addField({id: 'custpage_sale_tran_quantity',label: 'Quantity',type: serverWidget.FieldType.INTEGER});
          listBuilds.addField({
            id: 'custpage_build_quantity',
            label: 'Quantity',
            type: serverWidget.FieldType.INTEGER
          });
          listBuilds.addField({
            id: 'custpage_build_amt_total',
            label: 'Total COGS',
            type: serverWidget.FieldType.CURRENCY
          });
          listBuilds.addField({
            id: 'custpage_build_line_number',
            label: 'Line Number',
            type: serverWidget.FieldType.INTEGER
          });
          listBuilds.addField({
            id: 'custpage_build_asset_acct',
            label: 'Asset Account',
            type: serverWidget.FieldType.TEXT
          });
          listBuilds.addField({
            id: 'custpage_build_branch',
            label: 'Branch',
            type: serverWidget.FieldType.TEXT
          });

          let columnNames = Object.keys(results[0]);
          for (let i = 0; i < results.length; i++) {

            let result = results[i];
            for (let c = 0; c < columnNames.length; c++) {
              let columnName = columnNames[c];
              let value = result[columnName];
              switch (columnName) {

                case 'tranid':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_tranid',
                    line: i,
                    value: value
                  });
                  break;
                case 'customer':
                  // listBuilds.setSublistValue({
                  //   id: 'custpage_build_customer',
                  //   line: i,
                  //   value: value
                  // });
                  break;
                case 'id':
                  break;
                case 'vendor_code':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_vendor_code',
                    line: i,
                    value: value
                  });

                  break;
                case 'item':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_item_name',
                    line: i,
                    value: value
                  });
                  break;
                case 'inventory_item':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_item_name',
                    line: i,
                    value: value
                  });
                  break;
                case 'itemfufillment':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_item_fulfill',
                    line: i,
                    value: value
                  });
                  break;
                case 'status':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_status',
                    line: i,
                    value: value
                  });
                  break;
                case 'workorder':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_work_order',
                    line: i,
                    value: value
                  });
                  break;
                case 'trandate':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_tran_date',
                    line: i,
                    value: value
                  });
                  break;
                case 'quantity':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_quantity',
                    line: i,
                    value: value
                  });
                  break;
                case 'assetaccount':
                  break;
                case 'asset_acct':
                  listBuilds.setSublistValue({
                    id: 'custpage_sbuild_asset_acct',
                    line: i,
                    value: value
                  });
                  break;
                case 'line_number':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_line_number',
                    line: i,
                    value: value
                  });
                  break;
                case 'tal_netamount':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_amt_total',
                    line: i,
                    value: value
                  });
                  break;
                case 'branch':
                  listBuilds.setSublistValue({
                    id: 'custpage_build_branch',
                    line: i,
                    value: value
                  });
                  break;
                case 'location':
                  break;

                default:

              }
            }

          }

        }
        return true;
      }
      catch(e) {
        log.debug({title: `ln 895 build data`, details: `name: ${e.name}, message: ${e.message}`});
        return false;
      }

    }


    /**
     * Event handler for HTTP POST request
     *
     * @gov XXX
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - The incoming request object
     * @param {ServerResponse} context.response - The outgoing response object
     */
    function onPost(context) {
      // TODO
    //   onPost would fire on the submit
    // all values get passed into the HTTP object - would process the control value (reference by the control value). Posting it back to the server to do stuff.
    // could restate it in a text field so that it can be viewed, and then do something with it with a switch case.
    // suitelet pick a period and hit submit
    // process the post and list the values of the period selected - deposit the 
    // reports/financial/
    // nco_sl_tkm_trialbalance
    }


    function addButtons(form) {

    }

    /**
     * As part of troubleshooting, this will save the SQL Statement used to
     * be able to run separately from the script
     *
     * @param sql
     * @returns {{error}}
     */
    function saveSql(sql) {

      log.debug({title: `SL ln 385 entered saveSQL`});

      // ToDo: reinitialized constant in Global Space
      const queryFolderID = 527342;
      let requestPayload = {
        'folder': queryFolderID,
        'filename': `RW Hatfield Inventory Turnover SuiteLet Detail Troubleshooting`,
        'contents': sql,
        'description': `RW Hatfield Inventory Turnover SuiteLet Detail Troubleshooting`
      }

      log.debug({
        title: `SS ln 810 file payload request`,
        details: `${JSON.stringify(requestPayload)}`
      });

      let responsePayload;
      try {

        let fileObj = file.create(
          {
            name: requestPayload.filename,
            contents: requestPayload.contents,
            description: requestPayload.description,
            fileType: file.Type.PLAINTEXT,
            folder: queryFolderID,
            isOnline: false
          }
        );

        let fileID = fileObj.save();

        responsePayload = {}
        responsePayload.fileID = fileID;

      } catch (e) {

        log.error({
          title: `ln 976 sqlFileSave Error`,
          details: `name: ${e.name}, message:${e.message}`
        });
        responsePayload = {'error': e}

      }
      return responsePayload;
    } // end saveSQL

    exports.onRequest = onRequest;
    return exports;
  });