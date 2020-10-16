using {representacaomercado.db as db} from '../db/schema';


@path : '/services/alerts'
@impl : './alerts.js'

service alertsService {
    entity Temas     as projection on db.Temas;
    entity Historico as projection on db.Historico;

    entity Logs {
        key ID      : Integer;
            status  : String;
            message : String;
    }

    action atualizaStatusTemas() returns Logs;

}
