const cds = require('@sap/cds');
const dateFormat = require('dateformat');
const SequenceHelper = require("./lib/SequenceHelper");
module.exports = cds.service.impl(async (service) => {
    const db = await cds.connect.to("db");
    const { Temas, Historico } = service.entities;

    service.on("atualizaStatusTemas", async (context) => {

        let nTemasAtualizados = 0;
        let oLog = {
            ID: 0,
            status: "",
            message: ""
        };
        let aHist = [];

        const aTemas = await cds.read(Temas);

        for (let i = 0; i < aTemas.length; i++) {
            const tema = aTemas[i];

            if (tema.status !== 4) {
                //Tema em aberto, verifica data da ultima atualização
                if (tema.ultimoRegistro) {
                    const dToday = new Date();
                    const dUltimoRegistro = new Date(tema.ultimoRegistro);
                    const diffTime = Math.abs(dUltimoRegistro - dToday);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    console.log("Ultima Atualizacao:", tema.ultimoRegistro)
                    console.log("Qtd Dias sem atualizacao:", diffDays)

                    if (diffDays >= 90) {
                        //Alera Status para Sem Atualização
                        const dUltimoRegistro = dateFormat(dToday, "isoDateTime");
                        console.log("Atualizando Tema ID:", tema.ID );
                        const affectedRows = await service.update(Temas).set({ status_ID: 2, ultimoRegistro: dUltimoRegistro  }).where({ ID: tema.ID });
                        console.log("Tema Atualizado");
                        nTemasAtualizados = nTemasAtualizados + 1;
                        console.log("affectedRows:", affectedRows);
                        //Histórico
                        const oHist = JSON.parse(JSON.stringify(tema));
                        delete oHist.ID;                        
                        
                        oHist.idTema = tema.ID;
                        oHist.status_ID = 2;
                        oHist.ultimoRegistro = dToday;
                        oHist.statusAlterado = "Status alterado pelo sistema após 90 dias";
                        
                        console.log("Atualizando Histórico");
                        const aRows = await service.create(Historico).entries(oHist);
                        console.log("Historico Atualizado", aRows);
                        
                    }
                }

            }
        }

        //Atualiza Historico
        if (aHist.length > 0) {
            console.log("Atualizando Histórico");
            const aRows = await service.create(Historico).entries(aHist);
            console.log("Historico Atualizado", aRows);

        }

        oLog.message = `Quantidade de temas atualizados: ${nTemasAtualizados}`;

        context.reply(oLog);
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
        context.data.userAlteracao_ID = null;
        console.debug('Historico ID:', context.data.ID)

    });


});