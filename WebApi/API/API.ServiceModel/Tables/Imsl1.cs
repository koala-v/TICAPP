﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace WebApi.ServiceModel.Tables
{
    public class Imsl1
    {

        public string DocNo { get; set; }
        public string DocType { get; set; }    
        public string Description { get; set; }
        public Nullable<System.DateTime> StatusLogDateTime { get; set; }
        public string UserId { get; set; }
        public string StatusCode { get; set; }
        public string UpdateBy { get; set; }
        public Nullable<System.DateTime> UpdateDateTime { get; set; }   

    }
}
