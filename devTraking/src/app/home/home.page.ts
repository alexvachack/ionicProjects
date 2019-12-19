import {Component, ViewChild, ElementRef} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore, AngularFirestoreCollection} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Plugins} from '@capacitor/core';
const {Geolocation} = Plugins;
declare var google;
@Component({
    selector: 'app-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
})
export class HomePage {
    // Firebase Data
    locations: Observable<any>;
    locationsCollection: AngularFirestoreCollection<any>;

    // Map related
    @ViewChild('map', {static: false}) mapElement: ElementRef;
    map: any;
    markers = [];

    // Misc
    isTracking = false;
    watch: string;
    user = null;
    constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
        this.startTracking2();

        this.anonLogin();
    }
    ionViewWillEnter() {
        this.loadMap();
    }
    loadMap() {
        let latLng = new google.maps.LatLng(19.3530591, -99.1282835);
        let mapOptions = {
            center: latLng,
            zoom: 11,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
    }
    anonLogin() {
        this.afAuth.auth.signInAnonymously().then(res => {
            this.user = res.user;
            console.log('datos de usuario', res);

            this.locationsCollection = this.afs.collection(
                `locations/${this.user.uid}/track`,
                ref => ref.orderBy('timestamp')
            );

            // Make sure we also get the Firebase item ID!
            this.locations = this.locationsCollection.snapshotChanges().pipe(
                map(actions =>
                    actions.map(a => {
                        const data = a.payload.doc.data();
                        const id = a.payload.doc.id;
                        return {id, ...data};
                    })
                )
            );
            // Update Map marker on every change
            this.locations.subscribe(locations => {
                this.updateMap(locations);
            });
        });
    }
    stopTracking() {
        Geolocation.clearWatch({id: this.watch}).then(() => {
            this.isTracking = false;
        });
    }

    startTracking() {
        this.isTracking = true;
        this.watch = Geolocation.watchPosition({}, (position, err) => {
            console.log('Envio de posicion manual', position);
            if (position) {
                this.addNewLocation(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.timestamp
                );
                this.stopTracking();
            }
        });
    }

    startTracking2() {
        this.watch = Geolocation.watchPosition({}, (position, err) => {
            console.log('Posicion de Torres Celular y Wifi: ', position);
            if (position) {
                this.addNewLocation(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.timestamp
                );
                this.stopTracking();
            }
        });
    }


    addNewLocation(lat, lng, timestamp) {
        this.locationsCollection.add({
            lat,
            lng,
            timestamp
        });
        let position = new google.maps.LatLng(lat, lng);
        this.map.setCenter(position);
        this.map.setZoom(18);
    }
    updateMap(locations) {
        // Remove all current marker
        this.markers.map(marker => marker.setMap(null));
        this.markers = [];
        for (let loc of locations) {
            let latLng = new google.maps.LatLng(loc.lat, loc.lng);
            let marker = new google.maps.Marker({
                map: this.map,
                animation: google.maps.Animation.DROP,
                position: latLng
            });
            this.markers.push(marker);
        }
    }
    deleteLocation(pos) {
        this.locationsCollection.doc(pos.id).delete();
    }
}
