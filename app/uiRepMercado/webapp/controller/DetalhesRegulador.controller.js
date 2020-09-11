/* eslint-disable no-undef */
// eslint-disable-next-line no-undef
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], /**
 * @param {typeof sap.ui.model.json.JSONModel} JSONModel 
 * @param {typeof sap.ui.core.routing.History} History 
 * @param {typeof sap.ui.model.Filter} Filter 
 * @param {typeof sap.ui.model.FilterOperator} FilterOperator 
 * @param {typeof sap.m.MessageBox} MessageBox 
 */
function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox) {
    "use strict";

    return BaseController.extend("ps.uiRepMercado.controller.DetalhesRegulador", {

        formatter: formatter,

        isNewObject: false,

        onInit: function () {
            var oReguladorModel = new JSONModel({
                delay: 0,
                isEditMode: true
            });
            this.getRouter().getRoute("detalhesRegulador").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oReguladorModel, "editUsuarioModel");
        },
        
        onPageNavButtonPress: function () {
            history.go(-1);
        },

        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").idRegulador;
            var sPath = "";
            this.getView().byId("txtDescRegulador").setShowValueStateMessage(false);
            this.getView().byId("txtDescRegulador").setValueState(sap.ui.core.ValueState.None);
            if (sObjectId !== "New") {
                sPath = this.getView().getModel().createKey("/Reguladores", {
                    ID: sObjectId
                });
                
                this.getView().bindObject({
                    path: sPath
                });
            }else{
                this.isNewObject = true;
                this._initiateNewRegulador();
            }
        }, 

        _initiateNewRegulador: function(){
            var oModel = this.getView().getModel();
            oModel.createEntry("/Reguladores", {
                groupId: "createGroup",
                properties: {},
                success: function(oData){
                    var sPath = oModel.createKey("/Reguladores", {
                        ID: oData.ID
                    });
                    this.getView().bindObject({
                        path: sPath
                    });
                }.bind(this),
                error: function(oError){
                    var oErrorMsg = JSON.parse(oError.responseText);
					MessageBox.error(oErrorMsg.error.message.value);
                }
            })
        },

        onDescChange: function(oEvent){
            var sNewDesc = oEvent.getParameter("newValue");
            var sPath = this.getView().getBindingContext().getPath();
            this.getView().getModel().setProperty(sPath + "/descricao", sNewDesc);
        },

        onCancel: function () {
            if(this.isNewObject){
                this.getView().getModel().remove(this.getView().getBindingContext().getPath());
            }
            this.getView().getModel().resetChanges();
            history.go(-1);
        },     

        onSaveButtonPress: function(){
            if(this._validateFields()){
                this.getView().getModel().submitChanges();
                history.go(-1);
            }
        },

        _validateFields: function(){
            var sPath = this.getView().getBindingContext().getPath();
            var sDesc = this.getView().getModel().getProperty(sPath + "/descricao");
            if(sDesc !== undefined && sDesc !== null && sDesc.trim() !== ""){
                this.getView().byId("txtDescRegulador").setShowValueStateMessage(false);
                this.getView().byId("txtDescRegulador").setValueState(sap.ui.core.ValueState.None);
                return true;
            }else{
                this.getView().byId("txtDescRegulador").setShowValueStateMessage(true);
                this.getView().byId("txtDescRegulador").setValueState(sap.ui.core.ValueState.Error);
                this.getView().byId("txtDescRegulador").setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("noDescriptionMsg"));
                return false;
            }
        }
    });
});