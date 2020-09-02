const cds = require('@sap/cds');
//var request = require('request');

const SequenceHelper = require("./lib/SequenceHelper");
module.exports = cds.service.impl(async (service) =>
   {
       const db = await cds.connect.to("db");
       const {Temas,Historico} = service.entities;

         service.before("READ", Temas, async (context) => {
            console.log("Context User: ",context.user);
		    console.log("Context REQ: ",context.req);
            console.log("Context is Auth User: ",context.user.is('authenticated-user'));
                       
         });
               
        service.before("CREATE", Temas, async (context) => {
            const temaId = new SequenceHelper({
                db: db,
                sequence: "TEMAS_ID",
                table: "REPRESENTACAOMERCADO_DB_TEMAS",
                field: "ID"
            });
            console.debug('Busca ID')
            context.data.ID = await temaId.getNextNumber();            
            console.debug('ID:', context.data.ID )
            console.debug('Dados usuario logado:', context.user)  
           
        }); 
        
        service.before("CREATE", Historico, async (context) => {
                const histTemaId = new SequenceHelper({
                    db: db,
                    sequence: "HISTORICO_ID",
                    table: "REPRESENTACAOMERCADO_DB_HISTORICO",
                    field: "ID"
                });         
               
                context.data.ID = await histTemaId.getNextNumber();
                if (!context.data.ID) {
                    context.data.ID = 1;
                }
                context.data.userAlteracao_ID = context.user.id;
                 console.debug('Historico ID:', context.data.ID )
                
         }); 
    

});



