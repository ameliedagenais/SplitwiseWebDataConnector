(function() {
  'use strict';
 
  // This function toggles the label shown depending
  // on whether or not the user has been authenticated
  function updateUIWithAuthState(hasAuth) {
      if (hasAuth) {
          $(".notsignedin").css('display', 'none');
          $(".signedin").css('display', 'block');
      } else {
          $(".notsignedin").css('display', 'block');
          $(".signedin").css('display', 'none');
          window.location.href = "/requesttoken";
      }
  }
  
  function getExpenses()
  {
    var dataToReturn = [];
    var xhr = $.ajax({
            url: "http://localhost:3333/callapi",
            type: "GET",
            dataType: 'json',
            async: false,
            data: {
              token: tableau.password,
              passThroughParams: { limit : "0"},
              passThroughUrl: "https://secure.splitwise.com/api/v3.0/get_expenses"
            },
            success: function (data) {
              var expenses = data.expenses;
              
              for (var i = 0, len = expenses.length; i < len; i++) {
                dataToReturn.push({
                  "id": expenses[i].id,
                  "groupid": expenses[i].group_id,
                  "description": expenses[i].description,
                  "cost": expenses[i].cost,
                  "category": expenses[i].category.name,
                  "date": expenses[i].date,
                });
              }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                tableau.log(xhr.responseText + "\n" + thrownError);
                tableau.abortWithError("Error getting tags from flickr.");
            }
        }); 
    return dataToReturn;
  }
  
  function getGroups()
  {
     var dataToReturn = [];
     var xhr = $.ajax({
          url: "http://localhost:3333/callapi",
          type: "GET",
          dataType: 'json',
          async: false,
          data: {
            token: tableau.password,
            passThroughParams: {},
            passThroughUrl: "https://secure.splitwise.com/api/v3.0/get_groups"
          },
          success: function (data) {
            var groups = data.groups;
            
            for (var i = 0, len = groups.length; i < len; i++) {
              dataToReturn.push({
                "groupid": groups[i].id,
                "group_name": groups[i].name,
              });
            }              
          },
          error: function (xhr, ajaxOptions, thrownError) {
              tableau.log(xhr.responseText + "\n" + thrownError);
              tableau.abortWithError("Error getting tags from flickr.");
          }
      });  
      return dataToReturn;
  }

  //------------- Tableau WDC code -------------//
  // Create tableau connector, should be called first
  var myConnector = tableau.makeConnector();

  // Init function for connector, called during every phase but
  // only called when running inside the simulator or tableau
  myConnector.init = function(initCallback) {
      tableau.authType = tableau.authTypeEnum.custom;
      
      console.log("init");

      var accessToken = Cookies.get("accessToken");
      console.log("Access token is '" + accessToken + "'");
      var hasAuth = (accessToken && accessToken.length > 0) || tableau.password.length > 0;
      updateUIWithAuthState(hasAuth);

      initCallback();

      // If we are not in the data gathering phase, we want to store the token
      // This allows us to access the token in the data gathering phase
      if (tableau.phase == tableau.phaseEnum.interactivePhase || tableau.phase == tableau.phaseEnum.authPhase) {
          if (hasAuth) {
              tableau.log("Already have access token, we are good to go");
              var token = {
                      public: accessToken,
                      secret: Cookies.get("accessTokenSecret"),
                  };
              tableau.username = decodeURIComponent(accessToken.user_nsid);
              tableau.password = JSON.stringify(token);

              if (tableau.phase == tableau.phaseEnum.authPhase) {
                // Auto-submit here if we are in the auth phase
                tableau.submit()
              }
          }
          else
          {
             window.location.href = "/requesttoken";
          }
      }
  };

  // Declare the data to Tableau that we are returning from Splitwise
  myConnector.getSchema = function(schemaCallback) {
      var schema = [];
      
      console.log("Getting schema!");
      
      var expenses = [
        { id : "id", alias : "id", dataType : tableau.dataTypeEnum.int },
        { id : "groupid", alias : "groupid", dataType : tableau.dataTypeEnum.int },
        { id : "description", alias : "description", dataType : tableau.dataTypeEnum.string },
        { id : "cost", alias : "cost", dataType : tableau.dataTypeEnum.float },
        { id : "category", alias : "category", dataType : tableau.dataTypeEnum.string },
        { id : "date", alias : "date", dataType : tableau.dataTypeEnum.date },
      ];
      
      var groups = [
        { id : "groupid", alias : "groupid", dataType : tableau.dataTypeEnum.int },
        { id : "group_name", alias : "group_name", dataType : tableau.dataTypeEnum.string },
      ];

      var expensesTableInfo = {
        id: "SplitwiseExpenses",
        columns: expenses
      };
      
      var groupsTableInfo = {
        id: "SplitwiseGroups",
        columns: groups
      };

      //schema.push(tableInfo);

      schemaCallback([expensesTableInfo, groupsTableInfo]);
  };

  // This function calls reroutes the api calls based on which table 
  // needs a refresh and passes the results back to Tableau
  myConnector.getData = function(table, doneCallback) {
      
      var data;
      if(table.tableInfo.id == "SplitwiseExpenses")
      {
        data = getExpenses();
      }
      else
      {
        data = getGroups();
      }
      table.appendRows(data);
      doneCallback();
  };

  // Register the tableau connector, call this last
  tableau.registerConnector(myConnector);
  
  // Confirm whether the user is connected
  // Show button to get data
  $(document).ready(function() {
      console.log("Hoo");
      var accessToken = Cookies.get("accessToken");
      var hasAuth = accessToken && accessToken.length > 0;
      updateUIWithAuthState(hasAuth);

      $("#submitButton").click(function() {
          console.log("button clicked");
          tableau.connectionName = "Splitwise data";
          tableau.submit();
      });
  });
})();
