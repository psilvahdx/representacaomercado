// @ts-nocheck
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox) {
	"use strict";

	return BaseController.extend("ps.uiRepMercado.controller.UsuariosList", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel;

			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				usuariosTableTitle : this.getResourceBundle().getText("usuariosTableTitle"),				
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
			});
            this.getRouter().getRoute("cadUserApp").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "usuariosView"); 

            var oFilter = this.getView().byId("ListReportFilterBar"),
				that = this;
				
			oFilter.addEventDelegate({
				"onAfterRendering": function(oEvent) {					
                    var oButton = oEvent.srcControl._oSearchButton,
                        oClearButton = oEvent.srcControl._oClearButtonOnFB;                    
                    oButton.setText(that.getResourceBundle().getText("pesquisar_btn"));
                    oClearButton.setText(that.getResourceBundle().getText("limpar_filtro_btn"));
				}
			});

        },

        /**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
        _onObjectMatched: function (oEvent) {
            
                var oModel = this.getModel(),
                oObject = this.getModel("userLogModel").getData();
            
                if(oObject.userLog.userProfile_ID !== "ADM"){
            	    this.getRouter().navTo("temasList");
                }              
           
        },
        
        getUserData: function(){
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
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
                    error: function (oError) {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }
            
        },       

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
            var sTitle,
                sMessage,
                that = this,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("usuariosTableTitleCount", [iTotalItems]);
			} else {
                sTitle = this.getResourceBundle().getText("usuariosTableTitle");
                sMessage = this.getResourceBundle().getText("nenhum_registro_encontrado_cadastro");  
			}
            this.getModel("usuariosView").setProperty("/usuariosTableTitle", sTitle);
            this.getUserData();
        },
        
        onCreatePress: function(oEvent){
           this.getRouter().navTo("detalheUsuario", {
				idUser: "New"
			}); 
        },

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onTableItemPress : function (oEvent) {
			var oContext = oEvent.getParameter("listItem").getBindingContext(),
			oObject = this.getModel().getObject(oContext.getPath());

			//this.showBusy();
			this.getRouter().navTo("detalheUsuario", {
				idUser: oObject.ID
			});
        },
        
        buildFilters: function (oFilterUser) {

            var aFilter = new Filter([]),
			    oFilter = {};
            
                if(oFilterUser.ID){
                    oFilter = new Filter("ID", FilterOperator.EQ, oFilterUser.ID);
				    aFilter.aFilters.push(oFilter);
                }
                 if(oFilterUser.nome){
                    oFilter = new Filter({
                        path: 'nome',
                        operator: FilterOperator.Contains,
                        value1: oFilterUser.nome,
                        caseSensitive: false
                    });
				    aFilter.aFilters.push(oFilter);
                }
                if(oFilterUser.matricula){
                    oFilter = new Filter({
                        path: 'matricula',
                        operator: FilterOperator.Contains,
                        value1: oFilterUser.matricula,
                        caseSensitive: false
                    });
				    aFilter.aFilters.push(oFilter);
                }
                if (oFilterUser.perfil) {
                    for (let i = 0; i < oFilterUser.perfil.length; i++) {
                        var perfil_ID = oFilterUser.perfil[i];
                        oFilter = new Filter("perfil_ID", FilterOperator.EQ, perfil_ID);
				        aFilter.aFilters.push(oFilter); 
                    }
                    
                }               

            return aFilter;
        },

        onClearFilter: function(oEvent){
            this.clearFilters();
        },

		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
			
				this.onRefresh();
			} else {
                var aTableSearchState = [],
                    filterModel = this.getModel("filterModel"),
                    oTable = this.byId("tblUsers"),
				    oBinding = oTable.getBinding("items"),			
                    oFilterUsuarios= filterModel.getProperty("/usuarios"),
                    aSelKeysPerfil = this.byId("mtCBoxPerfil").getSelectedKeys();                    
                    if(aSelKeysPerfil && aSelKeysPerfil.length > 0 ){
                         oFilterUsuarios.perfil = aSelKeysPerfil;
                    }else{
                        oFilterUsuarios.perfil = [];
                    }                               
                   
                aTableSearchState = this.buildFilters(oFilterUsuarios);
                oBinding.filter(aTableSearchState.aFilters);               
			}

        },     

        clearFilters: function(){
            var  ofilterModel = this.getModel("filterModel"),
                oFilterUsuarios= ofilterModel.getProperty("/usuarios"),
                oTable = this.byId("tblUsers"),
                oBinding = oTable.getBinding("items"),
                oSelKeysPerfil = this.byId("mtCBoxPerfil"),
                aTableSearchState = [];
            
                oFilterUsuarios.perfil = [];
                oFilterUsuarios.nome = "";
                ofilterModel.refresh();

                oSelKeysPerfil.setSelectedKeys([]);

                aTableSearchState = this.buildFilters(oFilterUsuarios);
                oBinding.filter(aTableSearchState.aFilters);   
            
        },

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("tblUsers");
			oTable.getBinding("items").refresh();
		},       

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
        _onPageNavButtonPress: function(oEvent){
            this.clearFilters();
             history.go(-1);
        },

        onTableUsersSelectionChange: function(oEvent){

            var oSelContext = oEvent.getSource().getSelectedContexts();
            if (oSelContext.length > 0) {
                this.byId("btnDelUser").setEnabled(true);
            }else{
                this.byId("btnDelUser").setEnabled(false);
            }
            
        },

        onDeleteUser: function(oEvent){

            var oTblUsersDelete = this.byId("tblUsers"),
                oSelContext = oTblUsersDelete.getSelectedContexts(),
                that = this,
                sMessage ="",
                sSuccessMsg="",
                sErrorMsg = "",
                aUsersDelete="",
                oDeleteObjec = {
                    ids: ""
                }

            sErrorMsg = this.getResourceBundle().getText("erro_excluir_usuario");
            //Notifica que relacionamento entre Usuário será removido
            if (oSelContext.length > 1) {
                 sMessage = this.getResourceBundle().getText("confirma_exclusao_usarios_txt");
                 sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_usuarios");
            }else{
                sMessage = this.getResourceBundle().getText("confirma_exclusao_usario_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_usuario");
            }          

            for (let i = 0; i < oSelContext.length; i++) {                
                const oUserDel = this.getModel().getObject(oSelContext[i].getPath());
                aUsersDelete = aUsersDelete + oUserDel.ID + ";";
            }

            oDeleteObjec.ids = aUsersDelete;
           
            MessageBox.warning(
                sMessage,
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            that.sendDeleteUsuarioRequest(oDeleteObjec, sSuccessMsg, sErrorMsg );
                        }
                    }
                });

        },

        sendDeleteUsuarioRequest: function(sIdUser, successMsg, errorMsg){

            var oModel = this.getModel(),
                sSuccessMsg = successMsg,
                sErrorMsg = errorMsg,
                that = this;

            oModel.create("/deleteSelectedUsers", sIdUser,{
                success: function(oData){
                     that.getOwnerComponent()._genericSuccessMessage(sSuccessMsg);
                     that.getView().getModel().refresh();
                },
                error: function(oError){
                     that.getOwnerComponent()._genericErrorMessage(sErrorMsg);
                     that.getView().getModel().refresh();
                }
            });
        }
	});
});