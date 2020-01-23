import { Component, OnInit } from '@angular/core';
import { Lugar } from '../../interfaces/interfaces';

import * as mapboxgl from 'mapbox-gl';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../../services/websocket.service';

interface RespMarcadores {
  [ key: string ]: Lugar;
}


@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  mapa: mapboxgl.Map;

  // lugares: Lugar[] = [];
  lugares: RespMarcadores = {};

  // esta función es para saber donde esta colocado el marker dentro de mapbox
  markerMapbox: { [id: string]: mapboxgl.Marker } = {};

  constructor( private http: HttpClient, private wsService: WebsocketService ) { }

  ngOnInit() {
    this.http.get<RespMarcadores>('http://localhost:5000/mapa').subscribe( lugares => {
      this.lugares = lugares;
      this.crearMapa();
      });

    this.escucharSockets();
  }

  escucharSockets() {

    // marcador-nuevo
    this.wsService.listen('marcador-nuevo')
    .subscribe( ( marcador: Lugar ) =>  this.agregarMarcador( marcador ) );

    // marcador-mover
    this.wsService.listen('marcador-mover')
    .subscribe( ( marcador: Lugar) => {
      this.markerMapbox[marcador.id].setLngLat([marcador.lng, marcador.lat]);
    });

    // marcador-borrar
    this.wsService.listen('marcador-borrar')
    .subscribe( ( id: string ) =>  {
      this.markerMapbox[id].remove();
      delete this.markerMapbox[id];
    });
  }

  crearMapa() {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoiZGFuYmFydCIsImEiOiJjazVxeHl5bzEwN2hkM2ttMGw5OWJkdnhiIn0.5N-1rmAApExfdL--W4yMsg';
    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-91.7988527, 14.9665245],
      zoom: 14
      });

      // el object entries devuelve un arreglo del objeto
    for ( const [id, marcador] of Object.entries(this.lugares) ) {
        this.agregarMarcador(marcador);
      }
  }

  agregarMarcador( marcador: Lugar ) {

    // const html = `<h2>${ marcador.nombre } </h2>
    //               <br>
    //               <button>Borrar</button>`;

    const h2 = document.createElement('h2');
    h2.innerHTML = marcador.nombre;

    const btnborrar = document.createElement('button');
    btnborrar.innerHTML = 'Borrar';

    const div = document.createElement('div');
    div.append(h2, btnborrar);

    const customPopup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false
    }).setDOMContent(div);
    // .setHTML( html );

    const marker = new mapboxgl.Marker({
      // draggable para que se pueda mover el marcador
      draggable: true,
      color: marcador.color
    })
    .setLngLat([ marcador.lng, marcador.lat ])
    .setPopup(customPopup)
    // addTo para agregar el marcador al mapa
    .addTo( this.mapa );

    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      // console.log(lngLat);
      marcador.lat = lngLat.lat;
      marcador.lng = lngLat.lng;
      // TODO: crear evento para emitir las conrdenadas del marcador
      this.wsService.emit('marcador-mover', marcador );
    });

    btnborrar.addEventListener('click', () => {


      marker.remove();

      // TODO: Eliminar el marcador mediante sockets
      this.wsService.emit('marcador-borrar', marcador.id );
    });

    this.markerMapbox[ marcador.id ] = marker;
  }

  crearMarcador() {

    const customMarker: Lugar = {
      id: new Date().toISOString(),
      lng: -75.75512993582937,
      lat: 45.349977429009954,
      nombre: 'Sin Nombre',
      // Función para generar un color HEX random
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    };

    this.agregarMarcador( customMarker );

    // emitir marcador-nuevo
    this.wsService.emit('marcador-nuevo', customMarker );
  }

}
