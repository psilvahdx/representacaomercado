/* eslint-disable no-undef */
/* eslint-disable @sap/ui5-jsdocs/no-jsdoc */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("ps.uiRepMercado.controller.ReguladoresList", {

        formatter: formatter,
        
		onInit : function () {
            var oReguladorModel = new JSONModel({
                descricaoFilter : "",
                reguladorIdFilter: null,
                reguladoresRowCount: 0});

            this.setModel(oReguladorModel, "reguladoresView"); 

            this.getRouter().getRoute("cadReguladoresApp").attachPatternMatched(this._onObjectMatched, this);

        },

        _onObjectMatched: function () {
            var oTableBinding = this.getView().byId("tblReguladores").getBinding("items");
            oTableBinding.attachChange(function(){
                var sRowCount = this.getView().byId("tblReguladores").getItems().length;
                this.getView().getModel("reguladoresView").setProperty("/reguladoresRowCount", sRowCount);
            }.bind(this));
            this.getView().getModel().refresh();
        },
        
        getUserData: function(){
            var oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getModel("userLogModel"),
                that = this;
           if(!oObject.getProperty("/userLog/ID")){
                oModel.read("/UsersExtensions", {
                    urlParameters: {
                            "$expand": "userProfile,acoes"
                        },
                    success: function (oData) {                    
                        oObject.setProperty("/userLog",oData.results[0]);      
                        //that.getComissoes(oObject.getProperty("/userLog/ID"));               
                    },
                    error: function () {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }
            
        },
        
        onCreatePress: function(){
           this.getOwnerComponent().getRouter().navTo("detalhesRegulador", {
				idRegulador: "New"
			});
        },

		onTableItemPress : function (oEvent) {
            var sId = oEvent.getParameter("listItem").getCells()[0].getText()
            this.getOwnerComponent().getRouter().navTo("detalhesRegulador", {
				idRegulador: sId
			}); 
        },

		onSearch : function () {
            var oTableBinding = this.getView().byId("tblReguladores").getBinding("items"),
            sDescFilter = this.getView().byId("filterDesc").getValue(),
            aFilters = [];

            aFilters.push(new Filter("descricao", FilterOperator.Contains, sDescFilter));
            oTableBinding.filter(new Filter(aFilters, true));
        },       

        onPageNavButtonPress: function(){
             history.go(-1);
        }
	});
});