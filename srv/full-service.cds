using { representacaomercado.db as db } from '../db/schema';


@path: '/services/compliance'
@impl: './dataAccess.js'
@requires : 'authenticated-user'
service FullSerice {

entity Comissoes as projection on db.Comissoes;
entity Status as projection on db.Status;
entity Reguladores as projection on db.Reguladores;
entity Criticidades as projection on db.Criticidades;
entity Usuarios as projection on db.Usuarios;
entity Temas as projection on db.Temas;
entity Historico as projection on db.Historico;

}
/*
////////////////////////////////////////////////////////////////////////////
//
//	Usuarios Object Page
//
annotate FullSerice.Usuarios with @(
	UI: {
	  SelectionFields: [ matricula, nome ],
		LineItem: [
			{Value: matricula, Label:'Matricula'},
			{Value: nome, Label: 'Nome'},
			{Value: perfil, Label: 'Perfil'},
            {Value: telefone, Label: 'Telefone'},
            {Value: cargo, Label: 'Cargo'}
		]
	},
);


////////////////////////////////////////////////////////////////////////////
//
//	Usuarios Object Page
//
annotate FullSerice.Usuarios with @odata.draft.enabled;
annotate FullSerice.Usuarios with @(
	UI: {
		Facets: [
			{$Type: 'UI.ReferenceFacet', Label: 'Dados Usuário', Target: '@UI.FieldGroup#General'}
		],
		FieldGroup#General: {
			Data: [
				{Value: matricula, Label: 'Matricula'},
				{Value: nome, Label: 'Nome'},
				{Value: perfil, Label: 'Perfil'},
                {Value: cargo,  Label: 'Cargo'},
                {Value: telefone, Label: 'Telefone'}
			]
		}
	}
);
*/



