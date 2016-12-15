# Map Quiz

![](./img/mapquiz.gif)

Map Quiz is fun JavaScript-based geo-game developed by the Applications Prototype Lab. The game tests your geographic knowledge with six randomly selected satellite images. Prove that you are a geo-genius at home, school or in your workplace!

Click [here](http://maps.esri.com/rc/quiz/index.html) to access the live application.

### Introduction

This project is a port of an application initially developed as a Windows Store application.  The purpose of the application is to present a fun geography-focused game (or “geo-game”) based on [Esri](http://www.esri.com/) technology.  The application is primarily based on Esri’s [ArcGIS API for JavaScript](https://developers.arcgis.com/javascript/) and is powered by [ArcGIS Online](http://www.arcgis.com/) (AGOL) hosted services for scoring and questions.  Originally the Windows Store based application used AGOL-based authentically, in the JavaScript edition we decided to use Facebook authentication in an effort to appeal to a large audience.

### Why Facebook?

One of the motivations of gaming is the thrill of competition, whether personally or with others.  In order to identify users so that they could monitor their scores, or those of others, there needed to be some sort of authentication.  The obviously choice is AGOL.  AGOL is the perfect choice when collaboration is needed within the GIS community but a large percentage of the target audience of this application may not have AGOL credentials. Arguably, Facebook may not be completely ubiquitous but certainly common.  As such, we decided to use Facebook and the Facebook API to authenticate users.  To ease privacy concerns this application requests and displays only a small subset of profile information, specifically, a person’s profile picture, last name and initial of first name.

### Controlling Access to Hosted Services

The game’s questions, answers and scores are stored in two ArcGIS Online hosted feature services.  Hosted services are easy to create and allow for powerful spatial queries.  However access to hosted service is either unrestricted, or confined to an organization or to users that belong to specific groups.  Because this game is intended for non-AGOL users, we needed a way of restricting access to the hosted services to just the Map Quiz web application.

This was achieved by [registering the app](http://doc.arcgis.com/en/arcgis-online/share-maps/add-items.htm#ESRI_SECTION1_55703F1EE9C845C3B07BBD85221FB074) on AGOL.  The resulting app id and secret were then used in a web proxy that granted exclusive access to the hosted services to only the Map Quiz web application.  The proxy and instructions how to implement it are here.

### Spinning

The spinning map on the landing page or the gradual zooming of each question is achieved using CSS3 animation and the animo JavaScript library (see above).  On modern browsers the animation effects are smooth and consistent.  With respect to the spinning map, map edges needed to be expanded outwards to avoid white patches appearing in the corners.  To avoid this we applied negative margins using a Pythagorean computation.  One disadvantage of the spinning map is that image seams are occasionally observed.

### Silverlight vs. JavaScript

As a reformed Silverlight developer I have been pleasantly surprised with the performance and capabilities of JavaScript-based web applications.  To date, I have yet to encounter any Silverlight capability that could not be achieved with HTML5/CSS3.  The biggest issue has been the paradigm shift from Silverlight’s large well-documented framework to the necessity of working with a half dozen lightly documented open source libraries.

### Libraries Used

[animo.js](http://labs.bigroomstudios.com/libraries/animo-js), [ArcGIS API for JavaScript](https://developers.arcgis.com/javascript/), [Bootstrap](http://getbootstrap.com/), [Facebook SDK for JavaScript](https://developers.facebook.com/docs/javascript), [jQuery](http://jquery.com/)

### Conclusion

This  project was a fun and enjoyable exercise and we hope the reader is equally entertained by this application.  We showed that geo-games can be easily created with Esri’s JavaScript framework and cloud services together with common libraries like jQuery, bootstrap and Facebook.
