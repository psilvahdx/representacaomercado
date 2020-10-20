using {representacaomercado.db as db} from '../db/schema';


@path : '/services/alerts'
@impl : './alerts.js'

service alertsService {

    @readonly
    entity Temas          as projection on db.Temas;

    @readonly
    entity Historico      as projection on db.Historico;

    @readonly
    entity EventosAlerta  as projection on db.EventosAlerta;

    @readonly
    entity AlertasUsuario as projection on db.AlertasUsuario;

    @readonly
    entity Usuarios       as projection on db.Usuarios;

    @readonly
    entity AppSettings    as projection on db.AppSettings;

    entity Logs {
        key ID      : Integer;
            status  : String;
            message : String;
    }

    action atualizaStatusTemas() returns Logs;
    action disparaEmailsAlerta() returns Logs;

}
