namespace representacaomercado.db;

using {
    managed,
    cuid
} from '@sap/cds/common';

entity Comissoes : cuid {
    key ID        : Integer;
        descricao : String;
        regulador : Association to Reguladores;
        comIndicacao: Boolean;
}

entity Status : cuid {
    key ID        : Integer;
        descricao : String;
}

entity Reguladores : cuid {
    key ID        : Integer;
        descricao : String;
}

entity Criticidades : cuid {
    key ID        : Integer;
        descricao : String;
}

entity ClassificacaoCargo : cuid {
    key ID        : Integer;
        descricao : String;
}

entity Usuarios : cuid {
    key ID               : String;
        nome             : String;
        telefone         : String;
        cargo            : String;
        perfil           : Association to Perfis;
        comissoes        : Association to many ComissoesRepresentante
                               on comissoes.usuario = $self;
        diretorGeral     : String;
        diretorExecutivo : String;
        matricula        : String;
        cargoClassif     : Association to ClassificacaoCargo;
}

entity ComissoesRepresentante : cuid {
    key usuario  : Association to Usuarios;
    key comissao : Association to Comissoes;
}

entity Perfis : cuid {
    key ID        : String;
        descricao : String;
        acoes     : Association to PerfilAcoes;
}

entity Temas : cuid {
    key ID                 : Integer;
        descricao          : String;
        status             : Association to Status;
        criticidade        : Association to Criticidades;
        regulador          : Association to Reguladores;
        detalheDiscussao   : LargeString;
        principaisImpactos : LargeString;
        primeiroRegistro   : DateTime null;
        ultimoRegistro     : DateTime null;
        dataUltimaReuniao  : DateTime null;
        representante      : Association to Usuarios;
        comissao           : Association to Comissoes;
        diretorGeral       : String;
        diretorExecutivo   : String;

}

entity Historico : cuid {
    key ID                      : UUID;
        idTema                  : Integer;
        descricao               : String;
        status                  : Association to Status;
        criticidade             : Association to Criticidades;
        regulador               : Association to Reguladores;
        detalheDiscussao        : LargeString;
        principaisImpactos      : LargeString;
        primeiroRegistro        : DateTime null;
        ultimoRegistro          : DateTime null;
        dataUltimaReuniao       : DateTime null;
        representante           : Association to Usuarios;
        comissao                : Association to Comissoes;
        diretorGeral            : String;
        diretorExecutivo        : String;
        userAlteracao           : Association to Usuarios;
        descAlterda             : String;
        statusAlterado          : String;
        detalheAlterado         : String;
        princImpAlterado        : String;
        dtUltimaReuniaoAlterado : String;
        comissaoAlterado        : String;

}

entity PerfilAcoes : cuid {
    key ID                  : String;
        isDashBoardVisible  : Boolean;
        isCadastroVisible   : Boolean;
        changeRepresentante : Boolean;
        createTemas         : Boolean;
}

entity TiposAlerta : cuid {
    key ID        : UUID;
        descricao : String;
        perfil    : Association to Perfis;
}

entity AppSettings : cuid {
    key ID           : Integer;
        urlApi       : String;
        urlToken     : String;
        @cds.api.ignore
        clientID     : String;
        @cds.api.ignore
        clientSecret : String;

}

entity AlertasUsuario : cuid {
	key ID      : UUID;
        usuario : Association to Usuarios @assert.integrity:false;
		eventos : Association to many EventosAlerta on eventos.alertaUsuario = $self;		
}	

entity EventosAlerta : cuid {
    key ID        : UUID;
        descricao : String;        
		dtInicio : DateTime null;
		dtFim : DateTime null;		
		tipo: String(50) default 'Type06';
		conteudo: LargeString;
		enviaEmail: Boolean;
        tentative: Boolean;
        concluido: Boolean;
        statusTemas: String(10);
        alertaPessoal: Boolean;
        perfisQueRecebem: String(50);
        usuariosQueRecebem: String;
        eventoOrigem_ID: String;
		tipoAlerta : Association to TiposAlerta;
		alertaUsuario: Association to AlertasUsuario;
		
}	


entity TemasPorRegulador {
        key ID             : UUID;            
            ultimoRegistro : DateTime;
            status_ID      : Integer;
            itens   : Association to many TemasPorRegItem on itens.item = $self;
    };

     entity TemasPorCriticidade {
        key ID             : UUID;            
            ultimoRegistro : DateTime;
            status_ID      : Integer;
            itens   : Association to many TemasPorCrItem on itens.item = $self;
    };

    //@cds.autoexpose
 entity TemasPorRegItem {
        key ID: String;
        descricao      : String;
        qtd : Integer;
        item: Association to TemasPorRegulador;
    }

//@cds.autoexpose
 entity TemasPorCrItem {
        key ID: String;
        descricao      : String;
        qtd : Integer;
        item: Association to TemasPorCriticidade;
    }
