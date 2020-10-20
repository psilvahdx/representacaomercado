sap.ui.define([
    "sap/ui/core/format/DateFormat"
] , function (DateFormat) {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit : function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
        },
        
        date: function (oDate) {
			if (oDate === null) return "";
			var oDateFormat = DateFormat.getDateTimeInstance({
				pattern: "dd/MM/yyyy"
			});
			return oDateFormat.format(new Date(oDate), true);
		},

		dateTime: function (oDate) {
			if (oDate === null) return "";
			var oDateFormat = DateFormat.getDateTimeInstance({
				pattern: "dd/MM/yyyy HH:mm:ss"
			});
			return oDateFormat.format(new Date(oDate));
        },
        
        dateTimeUTC: function (oDate) {
			if (oDate === null) return "";
			var oDateFormat = DateFormat.getDateTimeInstance({
				pattern: "dd/MM/yyyy HH:mm:ss"
			});
			return oDateFormat.format(new Date(oDate),true);
		},

		formatDateShow: function (oDate) {
			var oDateInstance = DateFormat.getDateInstance({
				pattern: "dd/MM/yyyy"
			});
			return oDate && oDateInstance.format(new Date(oDate));
        },

        formatDateShortMonthYear: function (oDate) {
			var oDateInstance = DateFormat.getDateInstance({
				pattern: "MMM / yyyy",
                source: {
                    pattern: "MM/yyyy"
                }
			});
			return oDate && oDateInstance.format(new Date(oDate), true);
        },

        corCriticidade: function(oValue){

            var sCor = oValue;

            switch (sCor) {
                case 1:
                    sCor = "Error";
                    break;
                 case 2:
                    sCor = "Warning";
                    break;
                 case 3:
                    sCor = "Success";
                    break;            
                default:
                    sCor = "None";
                    break;
            }

            return sCor;

        },

        iconCriticidade: function(oValue){

            var sIconCriticidade = oValue;

            switch (sIconCriticidade) {
               
             case 1:
                    sIconCriticidade = "sap-icon://circle-task";
                    break;
             case 2:
                    sIconCriticidade = "sap-icon://up";
                    break;
             case 3:
                    sIconCriticidade = "sap-icon://border";
                    break;
                default:
                    break;
            }

            return sIconCriticidade;

        },
         corStatus: function(oValue){

            var sCor = oValue;

            switch (sCor) {
                case 1:
                    sCor = "None";
                    break;
                 case 2:
                    sCor = "Indication03";
                    break;
                 case 3:
                    sCor = "Information";
                    break; 
                case 4:
                    sCor = "Success";
                    break;             
                default:
                    sCor = "None";
                    break;
            }

            return sCor;

        },

        iconStatus: function(oValue){

            var sIconStatus = oValue;

            switch (sIconStatus) {
               
             case 1:
                    sIconStatus = "sap-icon://status-critical";
                    break;
             case 2:
                    sIconStatus = "sap-icon://status-critical";
                    break;
             case 3:
                    sIconStatus = "sap-icon://status-negative";
                    break;
             case 4:
                 sIconStatus = "sap-icon://status-positive";
                 break;
             default:
                   sIconStatus = "";
                  break;
            }

            return sIconStatus;

        }

	};

});