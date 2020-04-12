'use strict';


const NS = 'org.jamon'

/**
 * Function para tranferir jamones de un individuo a otro
 * @param {org.jamon.VenderJamon} venderJamon - Transaccion Jamon
 * @transaction
 */
async function venderJamon(tx){
    
    // Obtener asset registry para el jamon
    const jamonRegistry = await getAssetRegistry(NS + '.Jamon')

    // Obtener el participant registry para el Individuo
    const restauranteOwnerRegistry = await getParticipantRegistry(NS + '.PropietarioRestaurante')

    // Obtener el participant registry para el Individuo
    const ganaderoOwnerRegistry = await getParticipantRegistry(NS + '.Ganadero')

    // Logica de venta con misma divisa
    if (mismaDivisa(tx.jamon,tx.propietarioRestaurante,tx.ganadero) 
    && tieneDinero(tx.jamon,tx.propietarioRestaurante)) {
      // Guardamos estado en caso de Rollback
      let jamonRegistryAux = tx.jamon
      let restauranteOwnerRegistryAux = tx.propietarioRestaurante
      let ganaderoOwnerRegistryAux = tx.ganadero
      try {
        // set propietario del jamon e intercambio de dinero
        tx.jamon.propietario = tx.propietarioRestaurante
        tx.ganadero.dinero.cantidad =+ tx.jamon.precio.cantidad
        tx.propietarioRestaurante.dinero.cantidad =- tx.jamon.precio.cantidad
        
        // emit a notification that a trade has occurred
        let eventVentaDeJamon = getFactory().newEvent(NS, 'VentaDeJamonNotificacion');
        eventVentaDeJamon.jamonId = tx.jamon.jamonId;
        eventVentaDeJamon.precio = tx.jamon.precio;
        eventVentaDeJamon.nombreRestaurante = tx.propietarioRestaurante.nombreRestaurante;
        eventVentaDeJamon.contabilidadRestaurante = tx.propietarioRestaurante.contabilidad;
        eventVentaDeJamon.numeroLicenciaGanadero = tx.ganadero.numeroLicencia;
        eventVentaDeJamon.contabilidadGanadero = tx.ganadero.contabilidad;
        emit(eventVentaDeJamon);
        
        // persist el estado de la venta
        await jamonRegistry.update(tx.jamon);
        await ganaderoOwnerRegistry.update(tx.ganadero);
        await restauranteOwnerRegistry.update(tx.propietarioRestaurante);
        
      } catch (error) {
        // Rollback para mantener la situacion anterior
        await jamonRegistry.update(jamonRegistryAux);
        await ganaderoOwnerRegistry.update(ganaderoOwnerRegistryAux);
        await restauranteOwnerRegistry.update(restauranteOwnerRegistryAux);
      }  
    } else {
        // TODO: Planteamos logica con cambio de divisa
    }
     
}

function mismaDivisa(reg1, reg2, reg3){
    return (reg1.precio.divisa == reg2.contabilidad.divisa) && (reg1.precio.divisa == reg3.contabilidad.divisa)
}

function tieneDinero(producto, comprador){
    return comprador.contabilidad.cantidad >= producto.precio.cantidad
}
